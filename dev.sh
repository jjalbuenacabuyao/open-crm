#!/usr/bin/env bash
#
# Runs the whole stack for development: the Go API and the Angular dev server,
# with interleaved, labelled output. Ctrl+C stops both.
#
# Everything you open in a browser is http://localhost:4200 — `ng serve` owns
# that port and proxies /api to the Go server (client/proxy.conf.json), so the
# API is same-origin and CORS never comes into play locally.
#
#   ./dev.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT="$ROOT/client"
SERVER="$ROOT/server"
CLIENT_PORT=4200

# Job control, so each service lands in its own process group and cleanup can
# signal the whole tree. Without it, killing `pnpm` orphans the `ng serve` node
# process and port 4200 stays bound.
set -m

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
	C_RESET=$'\033[0m'; C_DIM=$'\033[2m'; C_BOLD=$'\033[1m'
	C_RED=$'\033[31m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'
	C_BLUE=$'\033[34m'; C_CYAN=$'\033[36m'
else
	C_RESET=''; C_DIM=''; C_BOLD=''
	C_RED=''; C_GREEN=''; C_YELLOW=''; C_BLUE=''; C_CYAN=''
fi

info() { printf '%s==>%s %s\n' "$C_BOLD$C_CYAN" "$C_RESET" "$*"; }
warn() { printf '%swarning:%s %s\n' "$C_YELLOW" "$C_RESET" "$*" >&2; }
die()  { printf '%serror:%s %s\n' "$C_RED" "$C_RESET" "$*" >&2; exit 1; }

# ---------------------------------------------------------------- preflight ---

need() { command -v "$1" >/dev/null 2>&1 || die "$1 is not on PATH. $2"; }

need go "Install Go, or see server/ for the required version."
need pnpm "Install pnpm — npm/yarn are not supported here (see client/package.json packageManager)."

[[ -d "$CLIENT/node_modules" ]] || die "client/node_modules is missing. Run: (cd client && pnpm install)"
[[ -f "$CLIENT/.env" ]] || die "client/.env is missing. Run: cp client/.env.example client/.env  (then fill in the Supabase values)"
[[ -f "$SERVER/.env" ]] || die "server/.env is missing. Run: cp server/.env.example server/.env  (then fill in the Supabase and Postgres values)"

# Reads a key from a .env file. Last assignment wins, quotes and CR stripped.
env_value() {
	local file=$1 key=$2
	sed -n "s/^[[:space:]]*${key}[[:space:]]*=[[:space:]]*//p" "$file" 2>/dev/null |
		tail -1 | tr -d '\r"'"'" | sed 's/[[:space:]]*$//'
}

API_PORT="$(env_value "$SERVER/.env" APP_PORT)"
API_PORT="${API_PORT:-8080}"

# The proxy target and APP_PORT have to agree or every /api call from the
# browser dead-ends, which surfaces as a confusing 500 rather than a clear error.
PROXY_PORT="$(grep -oE '"target"[^"]*"[^"]*:[0-9]+' "$CLIENT/proxy.conf.json" 2>/dev/null |
	grep -oE '[0-9]+$' | head -1)"
if [[ -n "$PROXY_PORT" && "$PROXY_PORT" != "$API_PORT" ]]; then
	die "port mismatch: server/.env APP_PORT=$API_PORT but client/proxy.conf.json targets :$PROXY_PORT.
       Make them match, or the browser cannot reach the API through :$CLIENT_PORT."
fi

port_busy() { (exec 3<>"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1; }

port_busy "$CLIENT_PORT" && die "port $CLIENT_PORT is already in use (the Angular dev server needs it).
       Find it with: lsof -i :$CLIENT_PORT"
port_busy "$API_PORT" && die "port $API_PORT is already in use (the Go API needs it).
       Find it with: lsof -i :$API_PORT"

# Postgres is checked rather than assumed: the API calls AutoMigrate at boot and
# exits on failure, so an unreachable database looks like the API "not starting".
DB_HOST="$(env_value "$SERVER/.env" HOST)"; DB_HOST="${DB_HOST:-localhost}"
DB_PORT="$(env_value "$SERVER/.env" DB_PORT)"; DB_PORT="${DB_PORT:-5432}"
if ! (exec 3<>"/dev/tcp/$DB_HOST/$DB_PORT") >/dev/null 2>&1; then
	warn "nothing is listening on $DB_HOST:$DB_PORT — the API will exit if it cannot migrate."
fi

if grep -q 'your-project-ref' "$CLIENT/.env" "$SERVER/.env" 2>/dev/null; then
	warn "Supabase placeholders are still present in .env — sign-in will fail until you fill them in."
fi

# ------------------------------------------------------------------- build ---

# Built up front rather than using `go run`: a compile error should fail here
# with a clean message instead of racing the dev server, and the binary gives us
# a directly signalable PID (`go run` would leave its child behind on Ctrl+C).
info "building the API…"
(cd "$SERVER" && go build -o ./tmp/main .) || die "the API failed to build."

# ------------------------------------------------------------------- start ---

PIDS=()
SHUTTING_DOWN=0

cleanup() {
	(( SHUTTING_DOWN )) && return
	SHUTTING_DOWN=1
	set +m # silence "Terminated" job-control chatter during teardown
	printf '\n'
	info "shutting down…"
	for pid in "${PIDS[@]}"; do
		kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
	done
	# Escalate only for whatever ignored SIGTERM.
	sleep 1
	for pid in "${PIDS[@]}"; do
		kill -KILL -- "-$pid" 2>/dev/null || true
	done
	wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

# Runs one service with every output line labelled, so interleaved logs stay
# readable. stdbuf keeps Go's output from sitting in a pipe buffer.
start() {
	local label=$1 color=$2 dir=$3
	shift 3
	(
		cd "$dir" || exit 1
		if command -v stdbuf >/dev/null 2>&1; then
			stdbuf -oL -eL "$@" 2>&1
		else
			"$@" 2>&1
		fi | while IFS= read -r line; do
			printf '%s%-6s%s %s│%s %s\n' "$color" "$label" "$C_RESET" "$C_DIM" "$C_RESET" "$line"
		done
	) &
	PIDS+=("$!")
}

info "API      http://localhost:$API_PORT  ${C_DIM}(proxied, no need to open directly)${C_RESET}"
info "APP      http://localhost:$CLIENT_PORT"
printf '%sPress Ctrl+C to stop both.%s\n\n' "$C_DIM" "$C_RESET"

start "api" "$C_GREEN" "$SERVER" ./tmp/main
start "web" "$C_BLUE" "$CLIENT" pnpm start

# If either service dies, take the other down too rather than leaving half a
# stack running and looking healthy.
wait -n
status=$?
warn "a service exited (status $status) — stopping the other."
exit "$status"

#!/usr/bin/env bash
#
# Runs the whole stack for development: the Go API and the TanStack Start dev
# server, with interleaved, labelled output. Ctrl+C stops both.
#
# Both halves live-reload. The API runs under air (`go tool air`, pinned in
# server/go.mod and configured by server/.air.toml), so editing Go rebuilds and
# restarts it; Vite already watches the client.
#
# The client is served from http://localhost:3000 and calls the API directly on
# its own port — there is no dev proxy, so every /api/v1 request is
# cross-origin and CORS_ORIGINS in server/.env has to list the client origin.
# That agreement is checked below, because getting it wrong surfaces in the
# browser as an opaque "network error" rather than anything readable.
#
#   ./dev.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT="$ROOT/client"
SERVER="$ROOT/server"

# Job control, so each service lands in its own process group and cleanup can
# signal the whole tree. Without it, killing `pnpm` orphans the `vite dev` node
# process and the client port stays bound.
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
need lsof "Install lsof — it is used to find and stop whatever is holding the dev ports."

[[ -d "$CLIENT/node_modules" ]] || die "client/node_modules is missing. Run: (cd client && pnpm install)"
[[ -f "$SERVER/.env" ]] || die "server/.env is missing. Run: cp server/.env.example server/.env  (then fill in the Supabase and Postgres values)"

# The port lives in the client's dev script (`vite dev --port N`) rather than
# here, so it stays right if that script changes.
CLIENT_PORT="$(grep -oE '"dev"[[:space:]]*:[[:space:]]*"[^"]*--port[[:space:]]+[0-9]+' "$CLIENT/package.json" 2>/dev/null |
	grep -oE '[0-9]+$' | head -1)"
CLIENT_PORT="${CLIENT_PORT:-3000}"
CLIENT_ORIGIN="http://localhost:$CLIENT_PORT"

# Reads a key from a .env file. Last assignment wins, quotes and CR stripped.
env_value() {
	local file=$1 key=$2
	sed -n "s/^[[:space:]]*${key}[[:space:]]*=[[:space:]]*//p" "$file" 2>/dev/null |
		tail -1 | tr -d '\r"'"'" | sed 's/[[:space:]]*$//'
}

API_PORT="$(env_value "$SERVER/.env" APP_PORT)"
API_PORT="${API_PORT:-8080}"

# No dev proxy means the browser talks to the API cross-origin, so the API has
# to allow the client's origin explicitly. An unset CORS_ORIGINS is not a free
# pass either — config.LoadCORSOrigins falls back to a single hard-coded origin.
CORS_ORIGINS="$(env_value "$SERVER/.env" CORS_ORIGINS)"
# Normalised the same way the server does it: whitespace out, trailing slashes
# off, so a cosmetic difference does not read as a misconfiguration.
CORS_LIST=",$(printf '%s' "${CORS_ORIGINS// /}" | sed 's:/*,:,:g; s:/*$::'),"
case "$CORS_LIST" in
	*",$CLIENT_ORIGIN,"* | *",*,"*) ;;
	*) die "CORS: server/.env CORS_ORIGINS is '${CORS_ORIGINS:-<unset>}', which does not include $CLIENT_ORIGIN.
       Every API call from the browser will fail as an opaque network error.
       Fix: set CORS_ORIGINS=$CLIENT_ORIGIN in server/.env" ;;
esac

port_busy() { (exec 3<>"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1; }

# Frees a port by stopping whatever is listening on it — usually a dev server
# left behind by an earlier run. SIGTERM first so it can shut down cleanly, then
# SIGKILL for anything still holding the port a couple of seconds later.
free_port() {
	local port=$1 name=$2 pids
	port_busy "$port" || return 0

	pids="$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | sort -u | tr '\n' ' ')"
	[[ -n "${pids// /}" ]] || die "port $port is in use (the $name needs it), but no process could be found to stop.
       It may belong to another user. Find it with: sudo lsof -i :$port"

	warn "port $port is in use — stopping PID(s) ${pids% } so the $name can start."
	kill -TERM $pids 2>/dev/null || true

	for _ in 1 2 3 4 5 6 7 8 9 10; do
		port_busy "$port" || return 0
		sleep 0.2
	done

	kill -KILL $pids 2>/dev/null || true
	sleep 0.3
	port_busy "$port" && die "port $port is still in use after killing PID(s) ${pids% }."
	return 0
}

free_port "$CLIENT_PORT" "Vite dev server"
free_port "$API_PORT" "Go API"

# Postgres is checked rather than assumed: the API calls AutoMigrate at boot and
# exits on failure, so an unreachable database looks like the API "not starting".
DB_HOST="$(env_value "$SERVER/.env" HOST)"; DB_HOST="${DB_HOST:-localhost}"
DB_PORT="$(env_value "$SERVER/.env" DB_PORT)"; DB_PORT="${DB_PORT:-5432}"
if ! (exec 3<>"/dev/tcp/$DB_HOST/$DB_PORT") >/dev/null 2>&1; then
	warn "nothing is listening on $DB_HOST:$DB_PORT — the API will exit if it cannot migrate."
fi

# The API refuses to boot without a usable Supabase project URL, so catch the
# untouched template here rather than in a stack trace.
if grep -q 'your-project-ref' "$SERVER/.env" 2>/dev/null; then
	warn "Supabase placeholders are still present in server/.env — the API will exit on an invalid configuration."
fi

# ------------------------------------------------------------------- build ---

# The API runs under air (`go tool air`) for live reload, and air would happily
# start up and just print the compile error. Building here first means a broken
# tree fails immediately, before the client dev server spends time booting.
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

info "API      http://localhost:$API_PORT"
info "APP      $CLIENT_ORIGIN"
printf '%sPress Ctrl+C to stop both.%s\n\n' "$C_DIM" "$C_RESET"

start "api" "$C_GREEN" "$SERVER" go tool air
start "web" "$C_BLUE" "$CLIENT" pnpm dev

# If either service dies, take the other down too rather than leaving half a
# stack running and looking healthy.
wait -n
status=$?
warn "a service exited (status $status) — stopping the other."
exit "$status"

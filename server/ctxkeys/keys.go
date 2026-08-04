// Package ctxkeys holds the context keys shared between the auth middleware and
// everything downstream of it. It depends on nothing, which is what lets
// handlers and repositories read the authenticated identity without importing
// the middleware package.
package ctxkeys

import "context"

// The keys are deliberately plain strings rather than a distinct key type:
// gin's Context.Set/GetString require string keys, and the same constants are
// used for both the gin context and the request context so a single value can
// be read from either side.
const (
	SupabaseUserID = "supabase_user_id"
	SupabaseEmail  = "supabase_email"
	SupabaseClaims = "supabase_claims"
)

// SupabaseUserIDFrom returns the authenticated Supabase user ID carried on the
// request context. The second result is false when the value is absent or empty.
func SupabaseUserIDFrom(ctx context.Context) (string, bool) {
	value, ok := ctx.Value(SupabaseUserID).(string)
	return value, ok && value != ""
}

// SupabaseEmailFrom returns the authenticated user's email claim. Tokens issued
// for phone-only or anonymous sign-ins carry no email, so callers must handle
// the false case rather than assuming one is present.
func SupabaseEmailFrom(ctx context.Context) (string, bool) {
	value, ok := ctx.Value(SupabaseEmail).(string)
	return value, ok && value != ""
}

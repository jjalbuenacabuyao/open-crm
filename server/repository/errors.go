package repository

import "errors"

var (
	// ErrUserNotFound is returned when no user matches the lookup.
	ErrUserNotFound = errors.New("user not found")

	// ErrEmailTaken is returned when the email on a token already belongs to a
	// local user linked to a different Supabase identity.
	ErrEmailTaken = errors.New("email is already linked to another account")

	// ErrUserDeactivated is returned when the matching local user is soft
	// deleted. The row still occupies the unique indexes, so it has to be
	// reported rather than silently re-created.
	ErrUserDeactivated = errors.New("user account is deactivated")
)

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

	// ErrNotFound is returned when a workspace-scoped record does not exist or
	// belongs to another workspace. The two are deliberately indistinguishable,
	// so IDs from other workspaces cannot be probed.
	ErrNotFound = errors.New("record not found")

	// ErrInvalidReference is returned when a write points at a related record
	// (company, contact, source, industry) that is not in the same workspace.
	ErrInvalidReference = errors.New("referenced record not found in this workspace")

	// ErrDuplicateName is returned when a lookup value (industry, source) with
	// the same name already exists in the workspace.
	ErrDuplicateName = errors.New("a record with this name already exists")
)

package domain

import "github.com/google/uuid"

// Describes how a Company is entered to the CRM
// e.g. Referral. indound, cold outreach, etc.
type Source struct {
	Base
	Name string `json:"name"`

	WorkspaceID uuid.UUID `json:"workspaceId"`
}

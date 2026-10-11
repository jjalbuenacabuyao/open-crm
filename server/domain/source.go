package domain

import "github.com/google/uuid"

// Source describes how a company or contact entered the CRM, e.g. referral,
// inbound, cold outreach.
type Source struct {
	Base
	Name string `gorm:"not null" json:"name"`

	WorkspaceID uuid.UUID `gorm:"type:uuid;not null;index" json:"workspaceId"`
}

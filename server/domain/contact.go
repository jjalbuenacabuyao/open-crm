package domain

import "github.com/google/uuid"

// Contact is a person, optionally working at a Company in the same workspace.
type Contact struct {
	Base
	FirstName string `gorm:"not null" json:"firstName"`
	LastName  string `json:"lastName"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	JobTitle  string `json:"jobTitle"`
	Notes     string `json:"notes"`

	CompanyID *uuid.UUID `gorm:"type:uuid;index" json:"companyId"`
	Company   *Company   `gorm:"foreignKey:CompanyID" json:"company,omitempty"`

	SourceID *uuid.UUID `gorm:"type:uuid" json:"sourceId"`
	Source   *Source    `gorm:"foreignKey:SourceID" json:"source,omitempty"`

	WorkspaceID uuid.UUID `gorm:"type:uuid;not null;index" json:"workspaceId"`
}

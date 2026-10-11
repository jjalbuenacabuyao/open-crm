package domain

import "github.com/google/uuid"

type Company struct {
	Base
	Name        string `gorm:"not null" json:"name"`
	Email       string `json:"email"`
	Phone       string `json:"phone"`
	Website     string `json:"website"`
	LinkedInURL string `json:"linkedInUrl"`
	Address     string `json:"address"`
	PostalCode  string `json:"postalCode"`
	Country     string `json:"country"`
	// Nullable so "unknown" is distinguishable from zero.
	CompanySize   *int     `json:"companySize"`
	AnnualRevenue *float64 `gorm:"type:numeric(16,2)" json:"annualRevenue"`

	// Nullable: a zero UUID would violate the foreign key.
	SourceID *uuid.UUID `gorm:"type:uuid" json:"sourceId"`
	Source   *Source    `gorm:"foreignKey:SourceID" json:"source,omitempty"`

	WorkspaceID uuid.UUID  `gorm:"type:uuid;not null;index" json:"workspaceId"`
	Industries  []Industry `gorm:"many2many:company_industries;" json:"industries,omitempty"`
}

package domain

import "github.com/google/uuid"

type Company struct {
	Base
	Name          string  `json:"name"`
	Email         string  `json:"email"`
	PostalCode    string  `json:"postalCode"`
	Country       string  `json:"country"`
	Website       *string `json:"url"`
	Address       string  `json:"address"`
	CompanySize   int     `json:"companySize"`
	AnnualRevenue float32 `json:"anualRevenue"`
	LinkedInUrl   string  `json:"linkedInUrl"`

	SourceID uuid.UUID `json:"sourceId"`
	Source   *Source   `gorm:"foreignKey:SourceID" json:"-"`

	WorkspaceID uuid.UUID  `json:"workspaceId"`
	Industries  []Industry `gorm:"many2many:company_industries;"`
}

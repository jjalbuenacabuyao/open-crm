package domain

type User struct {
  Base
  FirstName      string         `json:"firstName"`
	LastName       string         `json:"lastName"`
	Email          string         `gorm:"unique" json:"email"`
	SupabaseUserID *string        `gorm:"uniqueIndex" json:"-"`
  Workspaces     []Workspace    `gorm:"foreignKey:CreatedByID" json:"workspaces,omitempty"`
}
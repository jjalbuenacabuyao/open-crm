package domain

// Workspace is the tenancy boundary: every CRM record belongs to exactly one,
// and a workspace is visible only to the user in Base.CreatedByID. There is no
// membership model yet, so sharing a workspace is not possible.
type Workspace struct {
	Base
	Name string `gorm:"not null" json:"name"`
	// Currency is the ISO 4217 code every deal amount in the workspace is in.
	// Amounts carry no currency of their own, so the dashboard can sum them.
	Currency string `gorm:"size:3;not null;default:'USD'" json:"currency"`

	Companies  []Company  `gorm:"foreignKey:WorkspaceID" json:"-"`
	Contacts   []Contact  `gorm:"foreignKey:WorkspaceID" json:"-"`
	Deals      []Deal     `gorm:"foreignKey:WorkspaceID" json:"-"`
	Industries []Industry `gorm:"foreignKey:WorkspaceID" json:"-"`
	Sources    []Source   `gorm:"foreignKey:WorkspaceID" json:"-"`
}

package domain

type Workspace struct {
	Base
	Name string `json:"name"`

	Companies []Company `gorm:"foreignKey:WorkspaceID" json:"companies"`
	Industries []Industry `gorm:"foreignKey:WorkspaceID" json:"industries"`
}

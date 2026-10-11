package domain

import "github.com/google/uuid"

type Industry struct {
	Base
	Name string `gorm:"not null" json:"name"`

	WorkspaceID uuid.UUID `gorm:"type:uuid;not null;index" json:"workspaceId"`
}

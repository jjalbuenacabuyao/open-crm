package domain

import "github.com/google/uuid"

type Industry struct {
	Base
	Name string `json:"industry"`

  WorkspaceID uuid.UUID  `json:"workspaceId"`
}

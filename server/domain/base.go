package domain

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Base is embedded by every entity. Models are serialized straight to the API,
// so the columns that only matter internally are hidden with json:"-" rather
// than being stripped by a separate response type.
type Base struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	CreatedByID uuid.UUID      `gorm:"type:uuid" json:"-"`
}
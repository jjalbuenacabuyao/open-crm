package config

import (
	"log"

	"github.com/jjalbuenacabuyao/open-crm/domain"
	"gorm.io/gorm"
)

// AutoMigrate creates or updates the tables backing the domain models.
func AutoMigrate(db *gorm.DB) error {
  // domain.Base defaults ID to gen_random_uuid(), which is built into Postgres
  // 13+; pgcrypto is only needed on older servers. CREATE EXTENSION requires
  // elevated privileges, so a failure here is logged rather than fatal — it
  // would otherwise block startup against a perfectly healthy database.
  if err := db.Exec("CREATE EXTENSION IF NOT EXISTS pgcrypto").Error; err != nil {
    log.Printf("warning: could not ensure pgcrypto extension: %v", err)
  }

  return db.AutoMigrate(
    &domain.User{},
    &domain.Workspace{},
  )
}

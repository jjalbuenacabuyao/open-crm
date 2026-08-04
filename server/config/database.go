package config

import (
	"fmt"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func NewDB() (*gorm.DB, error) {
  dsn, err := loadDsn()
  if err != nil {
    return nil, err
  }

  db, err := gorm.Open(postgres.New(postgres.Config{
    DSN:                  dsn,
    PreferSimpleProtocol: true,
  }), &gorm.Config{})
  if err != nil {
    return nil, err
  }

  return db, nil
}

func loadDsn() (string, error) {
  HOST := GetEnv("HOST", "loaclhost")
  USER := GetEnv("DB_USER", "postgres")
  PASSWORD := GetEnv("PASSWORD", "postgres")
  DBNAME := GetEnv("DBNAME", "open-crm")
  PORT := GetEnv("DB_PORT", "5432")
  SSLMODE := GetEnv("SSLMODE", "disabled")
  TIMEZONE := GetEnv("TIMEZONE", "UTC")

  dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s", HOST, USER, PASSWORD, DBNAME, PORT, SSLMODE, TIMEZONE)
  return dsn, nil
}
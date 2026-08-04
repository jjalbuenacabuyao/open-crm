package config

import (
	"os"

	"github.com/joho/godotenv"
)

func LoadEnv() error {
  err := godotenv.Load()
  return err
}

func GetEnv(key, fallback string) string {
  if v, ok := os.LookupEnv(key); ok {
    return v
  }
  return fallback
}
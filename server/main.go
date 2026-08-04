package main

import (
	"log"

	"github.com/jjalbuenacabuyao/open-crm/app"
	"github.com/jjalbuenacabuyao/open-crm/config"
)

func main() {
  // A missing .env is normal in containers and CI, where the platform supplies
  // the environment directly, so this is a warning rather than a fatal error.
  if err := config.LoadEnv(); err != nil {
    log.Println("no .env file loaded, relying on the process environment")
  }

  app.New().Run()
}
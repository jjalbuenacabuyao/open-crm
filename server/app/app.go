package app

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/jjalbuenacabuyao/open-crm/config"
	"github.com/jjalbuenacabuyao/open-crm/container"
	"github.com/jjalbuenacabuyao/open-crm/middleware"
	"github.com/jjalbuenacabuyao/open-crm/routes"
)

type App struct {
  router *gin.Engine
  port   string
}

func New() *App {
  db, err := config.NewDB()
  if err != nil {
    log.Fatalf("failed to initialize database: %v", err)
  }

  if err := config.AutoMigrate(db); err != nil {
    log.Fatalf("failed to run migrations: %v", err)
  }

  c := container.New(db)

  if err := c.Supabase.Validate(); err != nil {
    log.Fatalf("invalid supabase configuration: %v", err)
  }

  router := gin.New()

  if err := router.SetTrustedProxies(nil); err != nil {
    log.Fatalf("failed to configure trusted proxies: %v", err)
  }

  router.Use(
    gin.Logger(),
    gin.Recovery(),
    middleware.CORS(c.CORSOrigins),
  )

  routes.Register(router, c)

  return &App{
    router: router,
    port: config.GetEnv("APP_PORT", "8080"),
  }
}

func (a *App) Run() {
  log.Printf("listening on :%s", a.port)
  if err := a.router.Run(":" + a.port); err != nil {
    log.Fatalf("server stopped: %v", err)
  }
}

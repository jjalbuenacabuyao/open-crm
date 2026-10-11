package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jjalbuenacabuyao/open-crm/container"
	"github.com/jjalbuenacabuyao/open-crm/middleware"
)

// Register mounts every route on the engine. Engine-level middleware (logging,
// recovery, CORS) is attached by the caller before this runs.
func Register(router *gin.Engine, c *container.Container) {
	router.GET("/health", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	requireAuth := middleware.SupabaseAuth(c.Supabase.JWKSURL, c.Supabase.Issuer)

	v1 := router.Group("/api/v1")

	auth := v1.Group("/auth")
	auth.Use(
		// Tier one, keyed by IP and placed before auth, so an unauthenticated
		// client cannot force unbounded signature verifications and JWKS fetches.
		middleware.RateLimit(3, 10, middleware.RateLimitKeyByIP),
		requireAuth,
		// Tier two, keyed by user. It has to come after auth or the key function
		// falls back to the IP and just duplicates tier one. Each RateLimit call
		// builds its own store, so these are independent budgets.
		middleware.RateLimit(10, 20, middleware.RateLimitKeyByUserOrIP),
	)
	auth.POST("/register", c.AuthHandler.Register)
	auth.GET("/me", c.AuthHandler.Me)

	// The CRM API. Same two-tier limiting as auth, with budgets sized for a
	// page that fires several queries at once. RequireUser resolves the local
	// user once for every route below it.
	workspaces := v1.Group("/workspaces")
	workspaces.Use(
		middleware.RateLimit(20, 60, middleware.RateLimitKeyByIP),
		requireAuth,
		middleware.RateLimit(15, 45, middleware.RateLimitKeyByUserOrIP),
		c.AuthHandler.RequireUser,
	)
	workspaces.GET("", c.WorkspaceHandler.List)
	workspaces.POST("", c.WorkspaceHandler.Create)

	// Everything under a workspace 404s unless the caller owns it.
	workspace := workspaces.Group("/:workspaceId")
	workspace.Use(c.WorkspaceHandler.RequireWorkspace)
	workspace.GET("", c.WorkspaceHandler.Get)
	workspace.PUT("", c.WorkspaceHandler.Update)
	workspace.DELETE("", c.WorkspaceHandler.Delete)
	workspace.GET("/stats", c.WorkspaceHandler.Stats)

	companies := workspace.Group("/companies")
	companies.GET("", c.CompanyHandler.List)
	companies.POST("", c.CompanyHandler.Create)
	companies.GET("/:id", c.CompanyHandler.Get)
	companies.PUT("/:id", c.CompanyHandler.Update)
	companies.DELETE("/:id", c.CompanyHandler.Delete)

	contacts := workspace.Group("/contacts")
	contacts.GET("", c.ContactHandler.List)
	contacts.POST("", c.ContactHandler.Create)
	contacts.GET("/:id", c.ContactHandler.Get)
	contacts.PUT("/:id", c.ContactHandler.Update)
	contacts.DELETE("/:id", c.ContactHandler.Delete)

	deals := workspace.Group("/deals")
	deals.GET("", c.DealHandler.List)
	deals.POST("", c.DealHandler.Create)
	deals.GET("/:id", c.DealHandler.Get)
	deals.PUT("/:id", c.DealHandler.Update)
	deals.PUT("/:id/stage", c.DealHandler.UpdateStage)
	deals.DELETE("/:id", c.DealHandler.Delete)

	industries := workspace.Group("/industries")
	industries.GET("", c.IndustryHandler.List)
	industries.POST("", c.IndustryHandler.Create)
	industries.DELETE("/:id", c.IndustryHandler.Delete)

	sources := workspace.Group("/sources")
	sources.GET("", c.SourceHandler.List)
	sources.POST("", c.SourceHandler.Create)
	sources.DELETE("/:id", c.SourceHandler.Delete)
}

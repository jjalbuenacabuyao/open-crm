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
}

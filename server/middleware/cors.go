package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const (
	corsAllowMethods  = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
	corsAllowHeaders  = "Authorization, Content-Type, Accept"
	corsExposeHeaders = "Retry-After"
	corsMaxAge        = "600"
)

// CORS answers browser preflights and adds the response headers that let the
// Angular client read this API's responses.
//
// Register it on the engine (not a route group) and register it first: gin
// feeds engine-level middleware through allNoRoute, which is what makes
// preflights work without an explicit OPTIONS route for every path, and a 401
// or 429 emitted without these headers reaches the browser as an opaque
// "network error" instead of a readable status.
//
// Credentials are deliberately not allowed. The client keeps its Supabase
// session in localStorage and authenticates with an Authorization header, so
// enabling cookies would add attack surface for no benefit.
func CORS(allowedOrigins []string) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(allowedOrigins))
	allowAll := false

	for _, origin := range allowedOrigins {
		origin = strings.TrimSuffix(strings.TrimSpace(origin), "/")
		if origin == "" {
			continue
		}
		if origin == "*" {
			allowAll = true
		}
		allowed[origin] = struct{}{}
	}

	return func(c *gin.Context) {
		origin := strings.TrimSuffix(c.GetHeader("Origin"), "/")
		if origin == "" {
			// Same-origin request or a non-browser client: nothing to negotiate.
			c.Next()
			return
		}

		if _, ok := allowed[origin]; !ok && !allowAll {
			if c.Request.Method == http.MethodOptions {
				// Answer the preflight without the allow headers so the browser
				// blocks the real request, which is the intended outcome.
				c.AbortWithStatus(http.StatusNoContent)
				return
			}
			c.Next()
			return
		}

		// Add rather than Set: overwriting Vary would discard any other value.
		c.Writer.Header().Add("Vary", "Origin")
		// Echo the exact origin instead of "*" so credentials remain an option.
		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Expose-Headers", corsExposeHeaders)

		if c.Request.Method == http.MethodOptions {
			c.Header("Access-Control-Allow-Methods", corsAllowMethods)
			c.Header("Access-Control-Allow-Headers", corsAllowHeaders)
			c.Header("Access-Control-Max-Age", corsMaxAge)
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

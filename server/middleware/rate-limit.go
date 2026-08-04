package middleware

import (
	"math"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// RateLimitKeyFunc decides which bucket a request draws from.
type RateLimitKeyFunc func(c *gin.Context) string

// RateLimitKeyByIP keys buckets by client IP, for unauthenticated routes.
func RateLimitKeyByIP(c *gin.Context) string {
	return "ip:" + c.ClientIP()
}

// RateLimitKeyByUserOrIP keys buckets by the authenticated Supabase user ID,
// falling back to client IP when SupabaseAuth has not run or did not set it.
func RateLimitKeyByUserOrIP(c *gin.Context) string {
	if userID := c.GetString(SupabaseUserIDKey); userID != "" {
		return "user:" + userID
	}
	return RateLimitKeyByIP(c)
}

type limiterEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

type limiterStore struct {
	mu      sync.Mutex
	entries map[string]*limiterEntry
	rps     rate.Limit
	burst   int
}

func (s *limiterStore) allow(key string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	entry, ok := s.entries[key]
	if !ok {
		entry = &limiterEntry{limiter: rate.NewLimiter(s.rps, s.burst)}
		s.entries[key] = entry
	}
	entry.lastSeen = time.Now()

	return entry.limiter.Allow()
}

func (s *limiterStore) evict(idleTTL time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for key, entry := range s.entries {
		if time.Since(entry.lastSeen) > idleTTL {
			delete(s.entries, key)
		}
	}
}

// No stop channel: stores live for the whole process lifetime.
func (s *limiterStore) cleanupLoop(interval, idleTTL time.Duration) {
	ticker := time.NewTicker(interval)
	for range ticker.C {
		s.evict(idleTTL)
	}
}

// RateLimit allows each client a sustained rps with the given burst, keyed by
// key, and aborts with 429 once a client's bucket is empty. Each call creates
// an independent limiter store.
func RateLimit(rps float64, burst int, key RateLimitKeyFunc) gin.HandlerFunc {
	if rps <= 0 {
		rps = 10
	}
	if burst <= 0 {
		burst = 20
	}

	store := &limiterStore{
		entries: make(map[string]*limiterEntry),
		rps:     rate.Limit(rps),
		burst:   burst,
	}
	go store.cleanupLoop(5*time.Minute, 15*time.Minute)

	retryAfter := strconv.Itoa(int(math.Max(1, math.Ceil(1/rps))))

	return func(c *gin.Context) {
		if !store.allow(key(c)) {
			c.Header("Retry-After", retryAfter)
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "Too many requests"})
			return
		}
		c.Next()
	}
}
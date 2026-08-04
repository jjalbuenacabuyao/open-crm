package middleware

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jjalbuenacabuyao/open-crm/ctxkeys"
)

// The canonical keys live in ctxkeys, which depends on nothing — that is what
// lets repository read the email claim without importing this package.
const (
	SupabaseUserIDKey = ctxkeys.SupabaseUserID
	SupabaseEmailKey  = ctxkeys.SupabaseEmail
	SupabaseClaimsKey = ctxkeys.SupabaseClaims
)

type jwksKeySet struct {
	url       string
	client    *http.Client
	mu        sync.RWMutex
	keys      map[string]*ecdsa.PublicKey
	expiresAt time.Time
}

type jwksResponse struct {
	Keys []jwk `json:"keys"`
}

type jwk struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	Alg string `json:"alg"`
	Crv string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"`
}

func SupabaseAuth(jwksURL, issuer string) gin.HandlerFunc {
	keySet := newJWKSKeySet(jwksURL)

	parserOpts := []jwt.ParserOption{
		jwt.WithValidMethods([]string{jwt.SigningMethodES256.Alg()}),
		jwt.WithExpirationRequired(),
		jwt.WithAudience("authenticated"),
	}
	if issuer != "" {
		parserOpts = append(parserOpts, jwt.WithIssuer(issuer))
	}

	return func(c *gin.Context) {
		tokenString, ok := bearerToken(c)
		if !ok {
			abortUnauthorized(c, "Missing or invalid authorization")
			return
		}

		claims := jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, keySet.keyFunc, parserOpts...)
		if err != nil || !token.Valid {
			abortUnauthorized(c, "Invalid or expired token")
			return
		}

		sub, ok := claims["sub"].(string)
		if !ok || sub == "" || claims["role"] != "authenticated" {
			abortUnauthorized(c, "Invalid authenticated user token")
			return
		}

		c.Set(SupabaseUserIDKey, sub)
		if email, ok := claims["email"].(string); ok && email != "" {
			c.Set(SupabaseEmailKey, email)
			c.Request = c.Request.WithContext(context.WithValue(c.Request.Context(), SupabaseEmailKey, email))
		}
		c.Set(SupabaseClaimsKey, claims)
		c.Request = c.Request.WithContext(context.WithValue(c.Request.Context(), SupabaseUserIDKey, sub))

		c.Next()
	}
}

func newJWKSKeySet(jwksURL string) *jwksKeySet {
	return &jwksKeySet{
		url: jwksURL,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func (s *jwksKeySet) keyFunc(token *jwt.Token) (any, error) {
	if token.Method.Alg() != jwt.SigningMethodES256.Alg() {
		return nil, jwt.ErrTokenSignatureInvalid
	}

	kid, ok := token.Header["kid"].(string)
	if !ok || kid == "" {
		return nil, errors.New("missing token key id")
	}

	key, ok := s.keyByID(kid)
	if ok {
		return key, nil
	}

	if err := s.refresh(); err != nil {
		return nil, err
	}

	key, ok = s.keyByID(kid)
	if !ok {
		return nil, fmt.Errorf("jwks key %q not found", kid)
	}

	return key, nil
}

func (s *jwksKeySet) keyByID(kid string) (*ecdsa.PublicKey, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if time.Now().After(s.expiresAt) {
		return nil, false
	}

	key, ok := s.keys[kid]
	return key, ok
}

func (s *jwksKeySet) refresh() error {
	req, err := http.NewRequest(http.MethodGet, s.url, nil)
	if err != nil {
		return err
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("jwks request failed with status %s", resp.Status)
	}

	var payload jwksResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return err
	}

	keys := make(map[string]*ecdsa.PublicKey, len(payload.Keys))
	for _, rawKey := range payload.Keys {
		key, err := parseES256PublicKey(rawKey)
		if err != nil {
			continue
		}
		keys[rawKey.Kid] = key
	}
	if len(keys) == 0 {
		return errors.New("jwks did not contain any usable ES256 keys")
	}

	s.mu.Lock()
	s.keys = keys
	s.expiresAt = time.Now().Add(10 * time.Minute)
	s.mu.Unlock()

	return nil
}

func parseES256PublicKey(rawKey jwk) (*ecdsa.PublicKey, error) {
	if rawKey.Kty != "EC" || rawKey.Crv != "P-256" || rawKey.Kid == "" {
		return nil, errors.New("not an ES256 key")
	}
	if rawKey.Alg != "" && rawKey.Alg != jwt.SigningMethodES256.Alg() {
		return nil, errors.New("unexpected key algorithm")
	}

	xBytes, err := base64.RawURLEncoding.DecodeString(rawKey.X)
	if err != nil {
		return nil, err
	}
	yBytes, err := base64.RawURLEncoding.DecodeString(rawKey.Y)
	if err != nil {
		return nil, err
	}

	x := new(big.Int).SetBytes(xBytes)
	y := new(big.Int).SetBytes(yBytes)
	curve := elliptic.P256()
	if !curve.IsOnCurve(x, y) {
		return nil, errors.New("public key is not on P-256 curve")
	}

	return &ecdsa.PublicKey{
		Curve: curve,
		X:     x,
		Y:     y,
	}, nil
}

func abortUnauthorized(c *gin.Context, message string) {
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": message})
}

func bearerToken(c *gin.Context) (string, bool) {
	if authHeader := c.GetHeader("Authorization"); authHeader != "" {
		token, ok := strings.CutPrefix(authHeader, "Bearer ")
		if !ok || strings.TrimSpace(token) == "" {
			return "", false
		}
		return token, true
	}

	token := strings.TrimSpace(c.Query("token"))
	if token == "" {
		return "", false
	}

	return token, true
}
package config

import (
	"errors"
	"strings"
)

// Supabase holds everything the auth middleware needs to validate a
// Supabase-issued access token.
type Supabase struct {
  ProjectURL string
  JWKSURL    string
  Issuer     string
}

// LoadSupabase derives the JWKS URL and the issuer from SUPABASE_PROJECT_URL so
// a normal .env only has to carry one value. SUPABASE_JWKS_URL and
// SUPABASE_ISSUER override the derived values, for self-hosted Supabase or a
// local `supabase start`.
func LoadSupabase() Supabase {
  projectURL := strings.TrimSuffix(strings.TrimSpace(GetEnv("SUPABASE_PROJECT_URL", "")), "/")
  jwksURL := strings.TrimSpace(GetEnv("SUPABASE_JWKS_URL", ""))
  issuer := strings.TrimSuffix(strings.TrimSpace(GetEnv("SUPABASE_ISSUER", "")), "/")

  if projectURL != "" {
    if jwksURL == "" {
      jwksURL = projectURL + "/auth/v1/.well-known/jwks.json"
    }
    if issuer == "" {
      issuer = projectURL + "/auth/v1"
    }
  }

  return Supabase{
    ProjectURL: projectURL,
    JWKSURL:    jwksURL,
    Issuer:     issuer,
  }
}

// Validate reports missing configuration. It exists because SupabaseAuth("")
// does not fail when it is constructed — it fails on every request afterwards
// with an unhelpful 401, so the misconfiguration has to be caught at boot.
func (s Supabase) Validate() error {
  if s.JWKSURL == "" {
    return errors.New("set SUPABASE_PROJECT_URL or SUPABASE_JWKS_URL")
  }
  if s.Issuer == "" {
    return errors.New("set SUPABASE_PROJECT_URL or SUPABASE_ISSUER")
  }
  return nil
}

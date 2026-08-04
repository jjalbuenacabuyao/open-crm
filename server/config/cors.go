package config

import "strings"

// DefaultCORSOrigin is the Angular dev server.
const DefaultCORSOrigin = "http://localhost:4200"

// LoadCORSOrigins reads the comma-separated CORS_ORIGINS list. An unset or
// empty value falls back to the Angular dev server so a fresh checkout works
// without any configuration.
func LoadCORSOrigins() []string {
  raw := GetEnv("CORS_ORIGINS", "")

  origins := make([]string, 0, 2)
  for origin := range strings.SplitSeq(raw, ",") {
    origin = strings.TrimSuffix(strings.TrimSpace(origin), "/")
    if origin != "" {
      origins = append(origins, origin)
    }
  }

  if len(origins) == 0 {
    return []string{DefaultCORSOrigin}
  }

  return origins
}

package handler

import (
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jjalbuenacabuyao/open-crm/ctxkeys"
	"github.com/jjalbuenacabuyao/open-crm/repository"
)

// registerRequest is the body of POST /api/v1/auth/register. The identity comes
// from the verified token, so only the display names are accepted here.
type registerRequest struct {
	FirstName string `json:"firstName" binding:"required,max=100"`
	LastName  string `json:"lastName" binding:"required,max=100"`
}

// AuthHandler owns the endpoints that mirror a Supabase identity into a local
// user. It never issues or inspects credentials — the token is already verified
// by the time a request reaches here.
type AuthHandler struct {
	users repository.UserRepository
}

func NewAuthHandler(users repository.UserRepository) *AuthHandler {
	return &AuthHandler{users: users}
}

// Register creates the local user for the authenticated Supabase identity,
// using the names supplied by the signup form. It is idempotent: repeat calls
// return the existing user with 200 instead of 201.
func (h *AuthHandler) Register(c *gin.Context) {
	var request registerRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "firstName and lastName are required"})
		return
	}

	params, ok := h.identity(c)
	if !ok {
		return
	}
	params.FirstName = strings.TrimSpace(request.FirstName)
	params.LastName = strings.TrimSpace(request.LastName)

	user, created, err := h.users.EnsureFromSupabase(c.Request.Context(), params)
	if err != nil {
		writeUserError(c, err)
		return
	}

	status := http.StatusOK
	if created {
		status = http.StatusCreated
	}
	c.JSON(status, user)
}

// Me returns the local user for the authenticated identity, provisioning it if
// it does not exist yet. That covers OAuth sign-ins, anyone who closed the tab
// before Register ran, and accounts that predate this endpoint.
func (h *AuthHandler) Me(c *gin.Context) {
	params, ok := h.identity(c)
	if !ok {
		return
	}
	params.FirstName, params.LastName = namesFromClaims(c)

	user, _, err := h.users.EnsureFromSupabase(c.Request.Context(), params)
	if err != nil {
		writeUserError(c, err)
		return
	}

	c.JSON(http.StatusOK, user)
}

// identity reads the verified identity off the request context. It writes the
// error response itself and reports false when the request cannot proceed.
func (h *AuthHandler) identity(c *gin.Context) (repository.EnsureUserParams, bool) {
	ctx := c.Request.Context()

	supabaseUserID, ok := ctxkeys.SupabaseUserIDFrom(ctx)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authenticated user"})
		return repository.EnsureUserParams{}, false
	}

	// Phone-only and anonymous sign-ins carry no email claim. domain.User.Email
	// is unique, so provisioning them would insert an empty string and the
	// second such account would fail with a confusing duplicate key error.
	email, ok := ctxkeys.SupabaseEmailFrom(ctx)
	if !ok {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Account has no email address"})
		return repository.EnsureUserParams{}, false
	}

	return repository.EnsureUserParams{
		SupabaseUserID: supabaseUserID,
		Email:          strings.ToLower(strings.TrimSpace(email)),
	}, true
}

// namesFromClaims pulls display names out of the token's user_metadata. The
// signup form puts first_name and last_name there; OAuth providers supply
// full_name or name instead.
func namesFromClaims(c *gin.Context) (firstName, lastName string) {
	claims, ok := c.Get(ctxkeys.SupabaseClaims)
	if !ok {
		return "", ""
	}

	claimsMap, ok := claims.(map[string]any)
	if !ok {
		return "", ""
	}

	metadata, ok := claimsMap["user_metadata"].(map[string]any)
	if !ok {
		return "", ""
	}

	firstName = stringClaim(metadata, "first_name")
	lastName = stringClaim(metadata, "last_name")
	if firstName != "" || lastName != "" {
		return firstName, lastName
	}

	fullName := stringClaim(metadata, "full_name")
	if fullName == "" {
		fullName = stringClaim(metadata, "name")
	}
	if fullName == "" {
		return "", ""
	}

	first, last, found := strings.Cut(fullName, " ")
	if !found {
		return first, ""
	}
	return first, strings.TrimSpace(last)
}

func stringClaim(metadata map[string]any, key string) string {
	value, _ := metadata[key].(string)
	return strings.TrimSpace(value)
}

// writeUserError maps repository sentinels to statuses. The underlying error is
// never echoed to the client: GORM errors leak column and constraint names.
func writeUserError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, repository.ErrUserNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
	case errors.Is(err, repository.ErrUserDeactivated):
		c.JSON(http.StatusForbidden, gin.H{"error": "This account has been deactivated"})
	case errors.Is(err, repository.ErrEmailTaken):
		c.JSON(http.StatusConflict, gin.H{"error": "This email is already linked to another account"})
	default:
		log.Printf("auth handler: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Something went wrong"})
	}
}

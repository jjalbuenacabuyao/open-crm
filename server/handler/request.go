package handler

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"reflect"
	"strconv"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/jjalbuenacabuyao/open-crm/domain"
	"github.com/jjalbuenacabuyao/open-crm/repository"
)

// Gin context keys for values resolved by this package's middleware. They are
// handler-internal, unlike the auth identity keys in ctxkeys.
const (
	userContextKey      = "current_user"
	workspaceContextKey = "current_workspace"
)

// currentUser returns the user stored by AuthHandler.RequireUser. Only call it
// from routes mounted behind that middleware.
func currentUser(c *gin.Context) *domain.User {
	return c.MustGet(userContextKey).(*domain.User)
}

// currentWorkspace returns the workspace stored by
// WorkspaceHandler.RequireWorkspace. Only call it from routes mounted behind
// that middleware.
func currentWorkspace(c *gin.Context) *domain.Workspace {
	return c.MustGet(workspaceContextKey).(*domain.Workspace)
}

// pathID parses a UUID path parameter. A malformed ID is answered with 404,
// the same as a well-formed one that does not exist.
func pathID(c *gin.Context, name string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(name))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Not found"})
		return uuid.Nil, false
	}
	return id, true
}

// queryID parses an optional UUID query parameter, answering 400 when it is
// present but malformed.
func queryID(c *gin.Context, name string) (*uuid.UUID, bool) {
	raw := strings.TrimSpace(c.Query(name))
	if raw == "" {
		return nil, true
	}
	id, err := uuid.Parse(raw)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": name + " must be a valid ID"})
		return nil, false
	}
	return &id, true
}

// listParams reads q, page, and pageSize. Unparseable numbers fall back to the
// defaults rather than failing the request.
func listParams(c *gin.Context) repository.ListParams {
	page, _ := strconv.Atoi(c.Query("page"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize"))
	return repository.ListParams{
		Query:    c.Query("q"),
		Page:     page,
		PageSize: pageSize,
	}.Normalize()
}

var useJSONFieldNames sync.Once

// bindJSON decodes and validates the body, answering 400 with a readable
// message naming the first invalid field.
func bindJSON(c *gin.Context, dst any) bool {
	useJSONFieldNames.Do(func() {
		if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
			v.RegisterTagNameFunc(func(field reflect.StructField) string {
				name, _, _ := strings.Cut(field.Tag.Get("json"), ",")
				if name == "" || name == "-" {
					return field.Name
				}
				return name
			})
		}
	})

	err := c.ShouldBindJSON(dst)
	if err == nil {
		return true
	}

	message := "Invalid request body"
	var validationErrors validator.ValidationErrors
	if errors.As(err, &validationErrors) && len(validationErrors) > 0 {
		message = validationMessage(validationErrors[0])
	}
	c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": message})
	return false
}

func validationMessage(fieldError validator.FieldError) string {
	field := fieldError.Field()
	switch fieldError.Tag() {
	case "required":
		return field + " is required"
	case "email":
		return field + " must be a valid email address"
	case "max":
		if fieldError.Kind() == reflect.String {
			return fmt.Sprintf("%s must be at most %s characters", field, fieldError.Param())
		}
		return fmt.Sprintf("%s must be at most %s", field, fieldError.Param())
	case "min":
		return fmt.Sprintf("%s must be at least %s", field, fieldError.Param())
	case "len":
		return fmt.Sprintf("%s must be %s characters", field, fieldError.Param())
	case "oneof":
		return fmt.Sprintf("%s must be one of: %s", field, fieldError.Param())
	case "datetime":
		return field + " must be a date in YYYY-MM-DD format"
	default:
		return field + " is invalid"
	}
}

// writeError maps repository sentinels to statuses and aborts. Anything
// unrecognised is logged and answered with a generic 500: GORM errors leak
// table, column, and constraint names.
func writeError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, repository.ErrNotFound):
		c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Not found"})
	case errors.Is(err, repository.ErrInvalidReference):
		c.AbortWithStatusJSON(http.StatusUnprocessableEntity, gin.H{"error": "A linked record does not exist in this workspace"})
	case errors.Is(err, repository.ErrDuplicateName):
		c.AbortWithStatusJSON(http.StatusConflict, gin.H{"error": "That name is already in use"})
	default:
		log.Printf("%s %s: %v", c.Request.Method, c.FullPath(), err)
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Something went wrong"})
	}
}

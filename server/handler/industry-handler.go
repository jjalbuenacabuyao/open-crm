package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jjalbuenacabuyao/open-crm/domain"
	"github.com/jjalbuenacabuyao/open-crm/repository"
)

// nameRequest is the body for creating a workspace lookup value.
type nameRequest struct {
	Name string `json:"name" binding:"required,max=100"`
}

type IndustryHandler struct {
	industries repository.IndustryRepository
}

func NewIndustryHandler(industries repository.IndustryRepository) *IndustryHandler {
	return &IndustryHandler{industries: industries}
}

func (h *IndustryHandler) List(c *gin.Context) {
	industries, err := h.industries.List(c.Request.Context(), currentWorkspace(c).ID)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, industries)
}

func (h *IndustryHandler) Create(c *gin.Context) {
	name, ok := bindName(c)
	if !ok {
		return
	}

	industry := &domain.Industry{
		Base:        domain.Base{CreatedByID: currentUser(c).ID},
		Name:        name,
		WorkspaceID: currentWorkspace(c).ID,
	}
	if err := h.industries.Create(c.Request.Context(), industry); err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, industry)
}

func (h *IndustryHandler) Delete(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}

	if err := h.industries.Delete(c.Request.Context(), currentWorkspace(c).ID, id); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func bindName(c *gin.Context) (string, bool) {
	var request nameRequest
	if !bindJSON(c, &request) {
		return "", false
	}

	name := strings.TrimSpace(request.Name)
	if name == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return "", false
	}
	return name, true
}

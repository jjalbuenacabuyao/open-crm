package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jjalbuenacabuyao/open-crm/domain"
	"github.com/jjalbuenacabuyao/open-crm/repository"
)

type SourceHandler struct {
	sources repository.SourceRepository
}

func NewSourceHandler(sources repository.SourceRepository) *SourceHandler {
	return &SourceHandler{sources: sources}
}

func (h *SourceHandler) List(c *gin.Context) {
	sources, err := h.sources.List(c.Request.Context(), currentWorkspace(c).ID)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, sources)
}

func (h *SourceHandler) Create(c *gin.Context) {
	name, ok := bindName(c)
	if !ok {
		return
	}

	source := &domain.Source{
		Base:        domain.Base{CreatedByID: currentUser(c).ID},
		Name:        name,
		WorkspaceID: currentWorkspace(c).ID,
	}
	if err := h.sources.Create(c.Request.Context(), source); err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, source)
}

func (h *SourceHandler) Delete(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}

	if err := h.sources.Delete(c.Request.Context(), currentWorkspace(c).ID, id); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

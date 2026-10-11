package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jjalbuenacabuyao/open-crm/domain"
	"github.com/jjalbuenacabuyao/open-crm/repository"
)

const defaultCurrency = "USD"

type workspaceRequest struct {
	Name     string `json:"name" binding:"required,max=100"`
	Currency string `json:"currency" binding:"omitempty,len=3,alpha"`
}

// WorkspaceHandler owns the workspace endpoints and the middleware that scopes
// every CRM route to one workspace the caller owns.
type WorkspaceHandler struct {
	workspaces repository.WorkspaceRepository
	stats      repository.StatsRepository
}

func NewWorkspaceHandler(workspaces repository.WorkspaceRepository, stats repository.StatsRepository) *WorkspaceHandler {
	return &WorkspaceHandler{workspaces: workspaces, stats: stats}
}

// RequireWorkspace resolves :workspaceId for the current user and stores it for
// currentWorkspace. Someone else's workspace is a 404, not a 403, so its
// existence is not confirmed. It must run after AuthHandler.RequireUser.
func (h *WorkspaceHandler) RequireWorkspace(c *gin.Context) {
	id, ok := pathID(c, "workspaceId")
	if !ok {
		return
	}

	workspace, err := h.workspaces.FindForUser(c.Request.Context(), id, currentUser(c).ID)
	if err != nil {
		writeError(c, err)
		return
	}

	c.Set(workspaceContextKey, workspace)
	c.Next()
}

func (h *WorkspaceHandler) List(c *gin.Context) {
	workspaces, err := h.workspaces.ListForUser(c.Request.Context(), currentUser(c).ID)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, workspaces)
}

func (h *WorkspaceHandler) Create(c *gin.Context) {
	var request workspaceRequest
	if !bindJSON(c, &request) {
		return
	}

	workspace := &domain.Workspace{
		Base: domain.Base{CreatedByID: currentUser(c).ID},
	}
	if !request.apply(c, workspace) {
		return
	}

	if err := h.workspaces.Create(c.Request.Context(), workspace); err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, workspace)
}

func (h *WorkspaceHandler) Get(c *gin.Context) {
	c.JSON(http.StatusOK, currentWorkspace(c))
}

func (h *WorkspaceHandler) Update(c *gin.Context) {
	var request workspaceRequest
	if !bindJSON(c, &request) {
		return
	}

	workspace := currentWorkspace(c)
	if !request.apply(c, workspace) {
		return
	}

	if err := h.workspaces.Update(c.Request.Context(), workspace); err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, workspace)
}

func (h *WorkspaceHandler) Delete(c *gin.Context) {
	if err := h.workspaces.Delete(c.Request.Context(), currentWorkspace(c).ID); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// Stats is the dashboard summary for the workspace.
func (h *WorkspaceHandler) Stats(c *gin.Context) {
	stats, err := h.stats.ForWorkspace(c.Request.Context(), currentWorkspace(c).ID)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (r workspaceRequest) apply(c *gin.Context, workspace *domain.Workspace) bool {
	name := strings.TrimSpace(r.Name)
	if name == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return false
	}

	workspace.Name = name
	workspace.Currency = strings.ToUpper(r.Currency)
	if workspace.Currency == "" {
		workspace.Currency = defaultCurrency
	}
	return true
}

package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jjalbuenacabuyao/open-crm/domain"
	"github.com/jjalbuenacabuyao/open-crm/repository"
)

type contactRequest struct {
	FirstName string     `json:"firstName" binding:"required,max=100"`
	LastName  string     `json:"lastName" binding:"max=100"`
	Email     string     `json:"email" binding:"omitempty,email,max=320"`
	Phone     string     `json:"phone" binding:"max=50"`
	JobTitle  string     `json:"jobTitle" binding:"max=200"`
	Notes     string     `json:"notes" binding:"max=10000"`
	CompanyID *uuid.UUID `json:"companyId"`
	SourceID  *uuid.UUID `json:"sourceId"`
}

type ContactHandler struct {
	contacts repository.ContactRepository
}

func NewContactHandler(contacts repository.ContactRepository) *ContactHandler {
	return &ContactHandler{contacts: contacts}
}

// List accepts q, page, pageSize, and companyId.
func (h *ContactHandler) List(c *gin.Context) {
	companyID, ok := queryID(c, "companyId")
	if !ok {
		return
	}

	params := repository.ContactListParams{ListParams: listParams(c), CompanyID: companyID}
	page, err := h.contacts.List(c.Request.Context(), currentWorkspace(c).ID, params)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, page)
}

func (h *ContactHandler) Get(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}

	contact, err := h.contacts.Find(c.Request.Context(), currentWorkspace(c).ID, id)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, contact)
}

func (h *ContactHandler) Create(c *gin.Context) {
	var request contactRequest
	if !bindJSON(c, &request) {
		return
	}

	contact := &domain.Contact{
		Base:        domain.Base{CreatedByID: currentUser(c).ID},
		WorkspaceID: currentWorkspace(c).ID,
	}
	if !request.apply(c, contact) {
		return
	}

	if err := h.contacts.Create(c.Request.Context(), contact); err != nil {
		writeError(c, err)
		return
	}
	h.respond(c, http.StatusCreated, contact.ID)
}

func (h *ContactHandler) Update(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}

	var request contactRequest
	if !bindJSON(c, &request) {
		return
	}

	contact := &domain.Contact{
		Base:        domain.Base{ID: id},
		WorkspaceID: currentWorkspace(c).ID,
	}
	if !request.apply(c, contact) {
		return
	}

	if err := h.contacts.Update(c.Request.Context(), contact); err != nil {
		writeError(c, err)
		return
	}
	h.respond(c, http.StatusOK, id)
}

func (h *ContactHandler) Delete(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}

	if err := h.contacts.Delete(c.Request.Context(), currentWorkspace(c).ID, id); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// respond re-reads the contact so the response carries its preloaded company
// and source, and database-set timestamps.
func (h *ContactHandler) respond(c *gin.Context, status int, id uuid.UUID) {
	contact, err := h.contacts.Find(c.Request.Context(), currentWorkspace(c).ID, id)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(status, contact)
}

func (r contactRequest) apply(c *gin.Context, contact *domain.Contact) bool {
	contact.FirstName = strings.TrimSpace(r.FirstName)
	if contact.FirstName == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "firstName is required"})
		return false
	}

	contact.LastName = strings.TrimSpace(r.LastName)
	contact.Email = strings.TrimSpace(r.Email)
	contact.Phone = strings.TrimSpace(r.Phone)
	contact.JobTitle = strings.TrimSpace(r.JobTitle)
	contact.Notes = strings.TrimSpace(r.Notes)
	contact.CompanyID = r.CompanyID
	contact.SourceID = r.SourceID
	return true
}

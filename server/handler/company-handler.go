package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jjalbuenacabuyao/open-crm/domain"
	"github.com/jjalbuenacabuyao/open-crm/repository"
)

type companyRequest struct {
	Name          string      `json:"name" binding:"required,max=200"`
	Email         string      `json:"email" binding:"omitempty,email,max=320"`
	Phone         string      `json:"phone" binding:"max=50"`
	Website       string      `json:"website" binding:"max=500"`
	LinkedInURL   string      `json:"linkedInUrl" binding:"max=500"`
	Address       string      `json:"address" binding:"max=500"`
	PostalCode    string      `json:"postalCode" binding:"max=20"`
	Country       string      `json:"country" binding:"max=100"`
	CompanySize   *int        `json:"companySize" binding:"omitempty,min=0"`
	AnnualRevenue *float64    `json:"annualRevenue" binding:"omitempty,min=0"`
	SourceID      *uuid.UUID  `json:"sourceId"`
	IndustryIDs   []uuid.UUID `json:"industryIds" binding:"max=20"`
}

type CompanyHandler struct {
	companies repository.CompanyRepository
}

func NewCompanyHandler(companies repository.CompanyRepository) *CompanyHandler {
	return &CompanyHandler{companies: companies}
}

func (h *CompanyHandler) List(c *gin.Context) {
	page, err := h.companies.List(c.Request.Context(), currentWorkspace(c).ID, listParams(c))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, page)
}

func (h *CompanyHandler) Get(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}

	company, err := h.companies.Find(c.Request.Context(), currentWorkspace(c).ID, id)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, company)
}

func (h *CompanyHandler) Create(c *gin.Context) {
	var request companyRequest
	if !bindJSON(c, &request) {
		return
	}

	company := &domain.Company{
		Base:        domain.Base{CreatedByID: currentUser(c).ID},
		WorkspaceID: currentWorkspace(c).ID,
	}
	if !request.apply(c, company) {
		return
	}

	ctx := c.Request.Context()
	if err := h.companies.Create(ctx, company, request.IndustryIDs); err != nil {
		writeError(c, err)
		return
	}
	h.respond(c, http.StatusCreated, company.ID)
}

func (h *CompanyHandler) Update(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}

	var request companyRequest
	if !bindJSON(c, &request) {
		return
	}

	company := &domain.Company{
		Base:        domain.Base{ID: id},
		WorkspaceID: currentWorkspace(c).ID,
	}
	if !request.apply(c, company) {
		return
	}

	if err := h.companies.Update(c.Request.Context(), company, request.IndustryIDs); err != nil {
		writeError(c, err)
		return
	}
	h.respond(c, http.StatusOK, id)
}

func (h *CompanyHandler) Delete(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}

	if err := h.companies.Delete(c.Request.Context(), currentWorkspace(c).ID, id); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// respond re-reads the company so the response carries its preloaded source,
// industries, and database-set timestamps.
func (h *CompanyHandler) respond(c *gin.Context, status int, id uuid.UUID) {
	company, err := h.companies.Find(c.Request.Context(), currentWorkspace(c).ID, id)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(status, company)
}

func (r companyRequest) apply(c *gin.Context, company *domain.Company) bool {
	company.Name = strings.TrimSpace(r.Name)
	if company.Name == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return false
	}

	company.Email = strings.TrimSpace(r.Email)
	company.Phone = strings.TrimSpace(r.Phone)
	company.Website = strings.TrimSpace(r.Website)
	company.LinkedInURL = strings.TrimSpace(r.LinkedInURL)
	company.Address = strings.TrimSpace(r.Address)
	company.PostalCode = strings.TrimSpace(r.PostalCode)
	company.Country = strings.TrimSpace(r.Country)
	company.CompanySize = r.CompanySize
	company.AnnualRevenue = r.AnnualRevenue
	company.SourceID = r.SourceID
	return true
}

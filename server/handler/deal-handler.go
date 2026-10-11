package handler

import (
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jjalbuenacabuyao/open-crm/domain"
	"github.com/jjalbuenacabuyao/open-crm/repository"
)

type dealRequest struct {
	Title  string           `json:"title" binding:"required,max=200"`
	Amount float64          `json:"amount" binding:"min=0"`
	Stage  domain.DealStage `json:"stage" binding:"omitempty,oneof=lead qualified proposal negotiation won lost"`
	// YYYY-MM-DD, or null.
	ExpectedCloseDate *string    `json:"expectedCloseDate" binding:"omitempty,datetime=2006-01-02"`
	Notes             string     `json:"notes" binding:"max=10000"`
	CompanyID         *uuid.UUID `json:"companyId"`
	ContactID         *uuid.UUID `json:"contactId"`
}

type dealStageRequest struct {
	Stage domain.DealStage `json:"stage" binding:"required,oneof=lead qualified proposal negotiation won lost"`
}

type DealHandler struct {
	deals repository.DealRepository
}

func NewDealHandler(deals repository.DealRepository) *DealHandler {
	return &DealHandler{deals: deals}
}

// List accepts q, page, pageSize, stage, companyId, and contactId.
func (h *DealHandler) List(c *gin.Context) {
	params := repository.DealListParams{ListParams: listParams(c)}

	var ok bool
	if params.CompanyID, ok = queryID(c, "companyId"); !ok {
		return
	}
	if params.ContactID, ok = queryID(c, "contactId"); !ok {
		return
	}
	if raw := c.Query("stage"); raw != "" {
		stage := domain.DealStage(raw)
		if !slices.Contains(domain.DealStages, stage) {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "stage is invalid"})
			return
		}
		params.Stage = &stage
	}

	page, err := h.deals.List(c.Request.Context(), currentWorkspace(c).ID, params)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, page)
}

func (h *DealHandler) Get(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}

	deal, err := h.deals.Find(c.Request.Context(), currentWorkspace(c).ID, id)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, deal)
}

func (h *DealHandler) Create(c *gin.Context) {
	var request dealRequest
	if !bindJSON(c, &request) {
		return
	}

	deal := &domain.Deal{
		Base:        domain.Base{CreatedByID: currentUser(c).ID},
		WorkspaceID: currentWorkspace(c).ID,
	}
	if !request.apply(c, deal) {
		return
	}
	setClosedAt(deal, nil)

	if err := h.deals.Create(c.Request.Context(), deal); err != nil {
		writeError(c, err)
		return
	}
	h.respond(c, http.StatusCreated, deal.ID)
}

func (h *DealHandler) Update(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}

	var request dealRequest
	if !bindJSON(c, &request) {
		return
	}

	ctx := c.Request.Context()
	existing, err := h.deals.Find(ctx, currentWorkspace(c).ID, id)
	if err != nil {
		writeError(c, err)
		return
	}

	deal := &domain.Deal{
		Base:        domain.Base{ID: id},
		WorkspaceID: existing.WorkspaceID,
	}
	if !request.apply(c, deal) {
		return
	}
	setClosedAt(deal, existing)

	if err := h.deals.Update(ctx, deal); err != nil {
		writeError(c, err)
		return
	}
	h.respond(c, http.StatusOK, id)
}

// UpdateStage moves a deal to another stage without resending the whole deal,
// which is what the pipeline board does.
func (h *DealHandler) UpdateStage(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}

	var request dealStageRequest
	if !bindJSON(c, &request) {
		return
	}

	ctx := c.Request.Context()
	existing, err := h.deals.Find(ctx, currentWorkspace(c).ID, id)
	if err != nil {
		writeError(c, err)
		return
	}

	deal := *existing
	deal.Stage = request.Stage
	setClosedAt(&deal, existing)

	if err := h.deals.Update(ctx, &deal); err != nil {
		writeError(c, err)
		return
	}
	h.respond(c, http.StatusOK, id)
}

func (h *DealHandler) Delete(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		return
	}

	if err := h.deals.Delete(c.Request.Context(), currentWorkspace(c).ID, id); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// respond re-reads the deal so the response carries its preloaded company and
// contact, and database-set timestamps.
func (h *DealHandler) respond(c *gin.Context, status int, id uuid.UUID) {
	deal, err := h.deals.Find(c.Request.Context(), currentWorkspace(c).ID, id)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(status, deal)
}

func (r dealRequest) apply(c *gin.Context, deal *domain.Deal) bool {
	deal.Title = strings.TrimSpace(r.Title)
	if deal.Title == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "title is required"})
		return false
	}

	deal.Amount = r.Amount
	deal.Stage = r.Stage
	if deal.Stage == "" {
		deal.Stage = domain.DealStageLead
	}
	deal.Notes = strings.TrimSpace(r.Notes)
	deal.CompanyID = r.CompanyID
	deal.ContactID = r.ContactID

	deal.ExpectedCloseDate = nil
	if r.ExpectedCloseDate != nil {
		// Already validated as YYYY-MM-DD by the binding tag.
		date, _ := time.Parse(time.DateOnly, *r.ExpectedCloseDate)
		deal.ExpectedCloseDate = &date
	}
	return true
}

// setClosedAt stamps the moment a deal enters a closed stage, keeps the stamp
// while it stays in that stage, and clears it if the deal is reopened.
func setClosedAt(deal, existing *domain.Deal) {
	if !deal.Stage.IsClosed() {
		deal.ClosedAt = nil
		return
	}
	if existing != nil && existing.Stage == deal.Stage && existing.ClosedAt != nil {
		deal.ClosedAt = existing.ClosedAt
		return
	}
	now := time.Now().UTC()
	deal.ClosedAt = &now
}


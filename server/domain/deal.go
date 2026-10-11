package domain

import (
	"time"

	"github.com/google/uuid"
)

// DealStage is a deal's position in the pipeline. The order of DealStages is
// the order the pipeline is displayed in.
type DealStage string

const (
	DealStageLead        DealStage = "lead"
	DealStageQualified   DealStage = "qualified"
	DealStageProposal    DealStage = "proposal"
	DealStageNegotiation DealStage = "negotiation"
	DealStageWon         DealStage = "won"
	DealStageLost        DealStage = "lost"
)

var DealStages = []DealStage{
	DealStageLead,
	DealStageQualified,
	DealStageProposal,
	DealStageNegotiation,
	DealStageWon,
	DealStageLost,
}

// IsClosed reports whether the stage ends the deal, won or lost.
func (s DealStage) IsClosed() bool {
	return s == DealStageWon || s == DealStageLost
}

type Deal struct {
	Base
	Title string `gorm:"not null" json:"title"`
	// In the workspace's currency.
	Amount float64   `gorm:"type:numeric(16,2);not null;default:0" json:"amount"`
	Stage  DealStage `gorm:"type:varchar(20);not null;default:'lead';index" json:"stage"`
	// A calendar date; the time part is always midnight UTC.
	ExpectedCloseDate *time.Time `gorm:"type:date" json:"expectedCloseDate"`
	// Set when the deal enters a closed stage, cleared if it is reopened.
	ClosedAt *time.Time `json:"closedAt"`
	Notes    string     `json:"notes"`

	CompanyID *uuid.UUID `gorm:"type:uuid;index" json:"companyId"`
	Company   *Company   `gorm:"foreignKey:CompanyID" json:"company,omitempty"`

	ContactID *uuid.UUID `gorm:"type:uuid;index" json:"contactId"`
	Contact   *Contact   `gorm:"foreignKey:ContactID" json:"contact,omitempty"`

	WorkspaceID uuid.UUID `gorm:"type:uuid;not null;index" json:"workspaceId"`
}

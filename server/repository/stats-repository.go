package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jjalbuenacabuyao/open-crm/domain"
	"gorm.io/gorm"
)

// StageSummary is the deal count and total amount in one pipeline stage.
type StageSummary struct {
	Stage  domain.DealStage `json:"stage"`
	Count  int64            `json:"count"`
	Amount float64          `json:"amount"`
}

// WorkspaceStats is the dashboard's summary of a workspace.
type WorkspaceStats struct {
	Companies int64 `json:"companies"`
	Contacts  int64 `json:"contacts"`
	OpenDeals int64 `json:"openDeals"`
	// Total amount of deals not yet won or lost.
	OpenPipeline float64 `json:"openPipeline"`
	WonAmount    float64 `json:"wonAmount"`
	// WinRate is won / (won + lost), or null before any deal has closed.
	WinRate *float64 `json:"winRate"`
	// One entry per stage, in pipeline order, including empty stages.
	Stages []StageSummary `json:"stages"`
}

type StatsRepository interface {
	ForWorkspace(ctx context.Context, workspaceID uuid.UUID) (*WorkspaceStats, error)
}

type statsRepository struct {
	db *gorm.DB
}

func NewStatsRepository(db *gorm.DB) StatsRepository {
	return &statsRepository{db: db}
}

func (r *statsRepository) ForWorkspace(ctx context.Context, workspaceID uuid.UUID) (*WorkspaceStats, error) {
	db := r.db.WithContext(ctx)
	stats := &WorkspaceStats{}

	if err := db.Model(&domain.Company{}).Where("workspace_id = ?", workspaceID).Count(&stats.Companies).Error; err != nil {
		return nil, err
	}
	if err := db.Model(&domain.Contact{}).Where("workspace_id = ?", workspaceID).Count(&stats.Contacts).Error; err != nil {
		return nil, err
	}

	var rows []StageSummary
	err := db.Model(&domain.Deal{}).
		Select("stage, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount").
		Where("workspace_id = ?", workspaceID).
		Group("stage").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	byStage := make(map[domain.DealStage]StageSummary, len(rows))
	for _, row := range rows {
		byStage[row.Stage] = row
	}

	stats.Stages = make([]StageSummary, 0, len(domain.DealStages))
	for _, stage := range domain.DealStages {
		summary := byStage[stage]
		summary.Stage = stage
		stats.Stages = append(stats.Stages, summary)

		if !stage.IsClosed() {
			stats.OpenDeals += summary.Count
			stats.OpenPipeline += summary.Amount
		}
	}

	won := byStage[domain.DealStageWon]
	lost := byStage[domain.DealStageLost]
	stats.WonAmount = won.Amount
	if closed := won.Count + lost.Count; closed > 0 {
		rate := float64(won.Count) / float64(closed)
		stats.WinRate = &rate
	}

	return stats, nil
}

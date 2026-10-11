package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jjalbuenacabuyao/open-crm/domain"
	"gorm.io/gorm"
)

type DealListParams struct {
	ListParams
	Stage     *domain.DealStage
	CompanyID *uuid.UUID
	ContactID *uuid.UUID
}

type DealRepository interface {
	List(ctx context.Context, workspaceID uuid.UUID, params DealListParams) (Page[domain.Deal], error)
	Find(ctx context.Context, workspaceID, id uuid.UUID) (*domain.Deal, error)
	// Create and Update validate CompanyID and ContactID against the deal's
	// workspace.
	Create(ctx context.Context, deal *domain.Deal) error
	Update(ctx context.Context, deal *domain.Deal) error
	Delete(ctx context.Context, workspaceID, id uuid.UUID) error
}

type dealRepository struct {
	db *gorm.DB
}

func NewDealRepository(db *gorm.DB) DealRepository {
	return &dealRepository{db: db}
}

func (r *dealRepository) List(ctx context.Context, workspaceID uuid.UUID, params DealListParams) (Page[domain.Deal], error) {
	params.ListParams = params.Normalize()
	query := r.db.WithContext(ctx).Model(&domain.Deal{}).Where("workspace_id = ?", workspaceID)
	if params.Stage != nil {
		query = query.Where("stage = ?", *params.Stage)
	}
	if params.CompanyID != nil {
		query = query.Where("company_id = ?", *params.CompanyID)
	}
	if params.ContactID != nil {
		query = query.Where("contact_id = ?", *params.ContactID)
	}
	if params.Query != "" {
		query = query.Where("title ILIKE ?", likePattern(params.Query))
	}

	return paginate[domain.Deal](query, params.ListParams, func(q *gorm.DB) *gorm.DB {
		return q.Preload("Company").Preload("Contact").Order("updated_at DESC")
	})
}

func (r *dealRepository) Find(ctx context.Context, workspaceID, id uuid.UUID) (*domain.Deal, error) {
	var deal domain.Deal
	err := r.db.WithContext(ctx).
		Preload("Company").Preload("Contact").
		Where("workspace_id = ? AND id = ?", workspaceID, id).
		First(&deal).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &deal, nil
}

func (r *dealRepository) Create(ctx context.Context, deal *domain.Deal) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := r.checkReferences(tx, deal); err != nil {
			return err
		}
		return tx.Omit("Company", "Contact").Create(deal).Error
	})
}

func (r *dealRepository) Update(ctx context.Context, deal *domain.Deal) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := r.checkReferences(tx, deal); err != nil {
			return err
		}

		result := tx.Model(deal).
			Where("workspace_id = ?", deal.WorkspaceID).
			Select("*").
			Omit("id", "created_at", "deleted_at", "created_by_id", "workspace_id", "Company", "Contact").
			Updates(deal)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrNotFound
		}
		return nil
	})
}

func (r *dealRepository) Delete(ctx context.Context, workspaceID, id uuid.UUID) error {
	result := r.db.WithContext(ctx).Where("workspace_id = ? AND id = ?", workspaceID, id).Delete(&domain.Deal{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *dealRepository) checkReferences(tx *gorm.DB, deal *domain.Deal) error {
	if err := ensureInWorkspace(tx, &domain.Company{}, deal.WorkspaceID, deal.CompanyID); err != nil {
		return err
	}
	return ensureInWorkspace(tx, &domain.Contact{}, deal.WorkspaceID, deal.ContactID)
}

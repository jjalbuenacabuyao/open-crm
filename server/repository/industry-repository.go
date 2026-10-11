package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jjalbuenacabuyao/open-crm/domain"
	"gorm.io/gorm"
)

type IndustryRepository interface {
	List(ctx context.Context, workspaceID uuid.UUID) ([]domain.Industry, error)
	// Create returns ErrDuplicateName if the name is taken, ignoring case.
	Create(ctx context.Context, industry *domain.Industry) error
	// Delete removes the industry from every company before deleting it.
	Delete(ctx context.Context, workspaceID, id uuid.UUID) error
}

type industryRepository struct {
	db *gorm.DB
}

func NewIndustryRepository(db *gorm.DB) IndustryRepository {
	return &industryRepository{db: db}
}

func (r *industryRepository) List(ctx context.Context, workspaceID uuid.UUID) ([]domain.Industry, error) {
	industries := make([]domain.Industry, 0)
	err := r.db.WithContext(ctx).
		Where("workspace_id = ?", workspaceID).
		Order("name ASC").
		Find(&industries).Error
	return industries, err
}

func (r *industryRepository) Create(ctx context.Context, industry *domain.Industry) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureNameFree(tx, &domain.Industry{}, industry.WorkspaceID, industry.Name); err != nil {
			return err
		}
		return tx.Create(industry).Error
	})
}

func (r *industryRepository) Delete(ctx context.Context, workspaceID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Where("workspace_id = ? AND id = ?", workspaceID, id).Delete(&domain.Industry{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrNotFound
		}
		return tx.Exec("DELETE FROM company_industries WHERE industry_id = ?", id).Error
	})
}

// ensureNameFree reports ErrDuplicateName when a live row of model in the
// workspace already has name, ignoring case. It is a check rather than a
// unique index because soft-deleted rows would otherwise block reuse.
func ensureNameFree(tx *gorm.DB, model any, workspaceID uuid.UUID, name string) error {
	var count int64
	err := tx.Model(model).
		Where("workspace_id = ? AND LOWER(name) = LOWER(?)", workspaceID, name).
		Count(&count).Error
	if err != nil {
		return err
	}
	if count > 0 {
		return ErrDuplicateName
	}
	return nil
}

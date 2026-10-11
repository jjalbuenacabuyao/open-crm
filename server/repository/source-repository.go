package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jjalbuenacabuyao/open-crm/domain"
	"gorm.io/gorm"
)

type SourceRepository interface {
	List(ctx context.Context, workspaceID uuid.UUID) ([]domain.Source, error)
	// Create returns ErrDuplicateName if the name is taken, ignoring case.
	Create(ctx context.Context, source *domain.Source) error
	// Delete unlinks the source from companies and contacts before deleting it.
	Delete(ctx context.Context, workspaceID, id uuid.UUID) error
}

type sourceRepository struct {
	db *gorm.DB
}

func NewSourceRepository(db *gorm.DB) SourceRepository {
	return &sourceRepository{db: db}
}

func (r *sourceRepository) List(ctx context.Context, workspaceID uuid.UUID) ([]domain.Source, error) {
	sources := make([]domain.Source, 0)
	err := r.db.WithContext(ctx).
		Where("workspace_id = ?", workspaceID).
		Order("name ASC").
		Find(&sources).Error
	return sources, err
}

func (r *sourceRepository) Create(ctx context.Context, source *domain.Source) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureNameFree(tx, &domain.Source{}, source.WorkspaceID, source.Name); err != nil {
			return err
		}
		return tx.Create(source).Error
	})
}

func (r *sourceRepository) Delete(ctx context.Context, workspaceID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Where("workspace_id = ? AND id = ?", workspaceID, id).Delete(&domain.Source{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrNotFound
		}
		if err := tx.Model(&domain.Company{}).Where("source_id = ?", id).Update("source_id", nil).Error; err != nil {
			return err
		}
		return tx.Model(&domain.Contact{}).Where("source_id = ?", id).Update("source_id", nil).Error
	})
}

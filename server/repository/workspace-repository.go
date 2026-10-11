package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jjalbuenacabuyao/open-crm/domain"
	"gorm.io/gorm"
)

type WorkspaceRepository interface {
	// ListForUser returns the workspaces the user owns, oldest first, so the
	// first one is a stable default.
	ListForUser(ctx context.Context, userID uuid.UUID) ([]domain.Workspace, error)
	// FindForUser returns ErrNotFound unless the workspace exists and the user
	// owns it.
	FindForUser(ctx context.Context, id, userID uuid.UUID) (*domain.Workspace, error)
	Create(ctx context.Context, workspace *domain.Workspace) error
	Update(ctx context.Context, workspace *domain.Workspace) error
	Delete(ctx context.Context, id uuid.UUID) error
}

type workspaceRepository struct {
	db *gorm.DB
}

func NewWorkspaceRepository(db *gorm.DB) WorkspaceRepository {
	return &workspaceRepository{db: db}
}

func (r *workspaceRepository) ListForUser(ctx context.Context, userID uuid.UUID) ([]domain.Workspace, error) {
	workspaces := make([]domain.Workspace, 0)
	err := r.db.WithContext(ctx).
		Where("created_by_id = ?", userID).
		Order("created_at ASC").
		Find(&workspaces).Error
	return workspaces, err
}

func (r *workspaceRepository) FindForUser(ctx context.Context, id, userID uuid.UUID) (*domain.Workspace, error) {
	var workspace domain.Workspace
	err := r.db.WithContext(ctx).
		Where("id = ? AND created_by_id = ?", id, userID).
		First(&workspace).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &workspace, nil
}

func (r *workspaceRepository) Create(ctx context.Context, workspace *domain.Workspace) error {
	return r.db.WithContext(ctx).Create(workspace).Error
}

func (r *workspaceRepository) Update(ctx context.Context, workspace *domain.Workspace) error {
	return r.db.WithContext(ctx).
		Model(workspace).
		Select("name", "currency").
		Updates(workspace).Error
}

// Delete soft-deletes the workspace. Its records are left in place but become
// unreachable, since every CRM route resolves the workspace first.
func (r *workspaceRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.Workspace{}, "id = ?", id).Error
}

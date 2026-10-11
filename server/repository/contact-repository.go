package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jjalbuenacabuyao/open-crm/domain"
	"gorm.io/gorm"
)

type ContactListParams struct {
	ListParams
	CompanyID *uuid.UUID
}

type ContactRepository interface {
	List(ctx context.Context, workspaceID uuid.UUID, params ContactListParams) (Page[domain.Contact], error)
	Find(ctx context.Context, workspaceID, id uuid.UUID) (*domain.Contact, error)
	// Create and Update validate CompanyID and SourceID against the contact's
	// workspace.
	Create(ctx context.Context, contact *domain.Contact) error
	Update(ctx context.Context, contact *domain.Contact) error
	// Delete unlinks the contact from its deals before deleting it.
	Delete(ctx context.Context, workspaceID, id uuid.UUID) error
}

type contactRepository struct {
	db *gorm.DB
}

func NewContactRepository(db *gorm.DB) ContactRepository {
	return &contactRepository{db: db}
}

func (r *contactRepository) List(ctx context.Context, workspaceID uuid.UUID, params ContactListParams) (Page[domain.Contact], error) {
	params.ListParams = params.Normalize()
	query := r.db.WithContext(ctx).Model(&domain.Contact{}).Where("workspace_id = ?", workspaceID)
	if params.CompanyID != nil {
		query = query.Where("company_id = ?", *params.CompanyID)
	}
	if params.Query != "" {
		pattern := likePattern(params.Query)
		query = query.Where(
			"first_name ILIKE ? OR last_name ILIKE ? OR (first_name || ' ' || last_name) ILIKE ? OR email ILIKE ? OR job_title ILIKE ?",
			pattern, pattern, pattern, pattern, pattern,
		)
	}

	return paginate[domain.Contact](query, params.ListParams, func(q *gorm.DB) *gorm.DB {
		return q.Preload("Company").Preload("Source").Order("created_at DESC")
	})
}

func (r *contactRepository) Find(ctx context.Context, workspaceID, id uuid.UUID) (*domain.Contact, error) {
	var contact domain.Contact
	err := r.db.WithContext(ctx).
		Preload("Company").Preload("Source").
		Where("workspace_id = ? AND id = ?", workspaceID, id).
		First(&contact).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &contact, nil
}

func (r *contactRepository) Create(ctx context.Context, contact *domain.Contact) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := r.checkReferences(tx, contact); err != nil {
			return err
		}
		return tx.Omit("Company", "Source").Create(contact).Error
	})
}

func (r *contactRepository) Update(ctx context.Context, contact *domain.Contact) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := r.checkReferences(tx, contact); err != nil {
			return err
		}

		result := tx.Model(contact).
			Where("workspace_id = ?", contact.WorkspaceID).
			Select("*").
			Omit("id", "created_at", "deleted_at", "created_by_id", "workspace_id", "Company", "Source").
			Updates(contact)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrNotFound
		}
		return nil
	})
}

func (r *contactRepository) Delete(ctx context.Context, workspaceID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Where("workspace_id = ? AND id = ?", workspaceID, id).Delete(&domain.Contact{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrNotFound
		}
		return tx.Model(&domain.Deal{}).Where("contact_id = ?", id).Update("contact_id", nil).Error
	})
}

func (r *contactRepository) checkReferences(tx *gorm.DB, contact *domain.Contact) error {
	if err := ensureInWorkspace(tx, &domain.Company{}, contact.WorkspaceID, contact.CompanyID); err != nil {
		return err
	}
	return ensureInWorkspace(tx, &domain.Source{}, contact.WorkspaceID, contact.SourceID)
}

package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jjalbuenacabuyao/open-crm/domain"
	"gorm.io/gorm"
)

type CompanyRepository interface {
	List(ctx context.Context, workspaceID uuid.UUID, params ListParams) (Page[domain.Company], error)
	Find(ctx context.Context, workspaceID, id uuid.UUID) (*domain.Company, error)
	// Create and Update validate SourceID and industryIDs against the
	// company's workspace and replace its industries with industryIDs.
	Create(ctx context.Context, company *domain.Company, industryIDs []uuid.UUID) error
	Update(ctx context.Context, company *domain.Company, industryIDs []uuid.UUID) error
	// Delete unlinks the company from its contacts and deals before deleting it.
	Delete(ctx context.Context, workspaceID, id uuid.UUID) error
}

type companyRepository struct {
	db *gorm.DB
}

func NewCompanyRepository(db *gorm.DB) CompanyRepository {
	return &companyRepository{db: db}
}

func (r *companyRepository) List(ctx context.Context, workspaceID uuid.UUID, params ListParams) (Page[domain.Company], error) {
	params = params.Normalize()
	query := r.db.WithContext(ctx).Model(&domain.Company{}).Where("workspace_id = ?", workspaceID)
	if params.Query != "" {
		pattern := likePattern(params.Query)
		query = query.Where("name ILIKE ? OR email ILIKE ? OR website ILIKE ?", pattern, pattern, pattern)
	}

	return paginate[domain.Company](query, params, func(q *gorm.DB) *gorm.DB {
		return q.Preload("Source").Preload("Industries").Order("created_at DESC")
	})
}

func (r *companyRepository) Find(ctx context.Context, workspaceID, id uuid.UUID) (*domain.Company, error) {
	return findCompany(r.db.WithContext(ctx), workspaceID, id)
}

func findCompany(tx *gorm.DB, workspaceID, id uuid.UUID) (*domain.Company, error) {
	var company domain.Company
	err := tx.Preload("Source").Preload("Industries").
		Where("workspace_id = ? AND id = ?", workspaceID, id).
		First(&company).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &company, nil
}

func (r *companyRepository) Create(ctx context.Context, company *domain.Company, industryIDs []uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		industries, err := r.checkReferences(tx, company, industryIDs)
		if err != nil {
			return err
		}
		if err := tx.Omit("Source", "Industries").Create(company).Error; err != nil {
			return err
		}
		return r.replaceIndustries(tx, company, industries)
	})
}

func (r *companyRepository) Update(ctx context.Context, company *domain.Company, industryIDs []uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		industries, err := r.checkReferences(tx, company, industryIDs)
		if err != nil {
			return err
		}

		// Select(*) writes zero values too, so a cleared field is actually
		// cleared. The Base columns are omitted so ownership and timestamps
		// cannot be rewritten through the request.
		result := tx.Model(company).
			Where("workspace_id = ?", company.WorkspaceID).
			Select("*").
			Omit("id", "created_at", "deleted_at", "created_by_id", "workspace_id", "Source", "Industries").
			Updates(company)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrNotFound
		}
		return r.replaceIndustries(tx, company, industries)
	})
}

func (r *companyRepository) Delete(ctx context.Context, workspaceID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Where("workspace_id = ? AND id = ?", workspaceID, id).Delete(&domain.Company{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrNotFound
		}

		// Soft deletes never fire the foreign keys, so the links are cleared by
		// hand; otherwise contacts and deals would point at a hidden company.
		if err := tx.Model(&domain.Contact{}).Where("company_id = ?", id).Update("company_id", nil).Error; err != nil {
			return err
		}
		return tx.Model(&domain.Deal{}).Where("company_id = ?", id).Update("company_id", nil).Error
	})
}

func (r *companyRepository) checkReferences(tx *gorm.DB, company *domain.Company, industryIDs []uuid.UUID) ([]domain.Industry, error) {
	if err := ensureInWorkspace(tx, &domain.Source{}, company.WorkspaceID, company.SourceID); err != nil {
		return nil, err
	}

	industries := make([]domain.Industry, 0, len(industryIDs))
	if len(industryIDs) == 0 {
		return industries, nil
	}

	if err := tx.Where("workspace_id = ? AND id IN ?", company.WorkspaceID, industryIDs).Find(&industries).Error; err != nil {
		return nil, err
	}

	found := make(map[uuid.UUID]struct{}, len(industries))
	for _, industry := range industries {
		found[industry.ID] = struct{}{}
	}
	for _, id := range industryIDs {
		if _, ok := found[id]; !ok {
			return nil, ErrInvalidReference
		}
	}
	return industries, nil
}

func (r *companyRepository) replaceIndustries(tx *gorm.DB, company *domain.Company, industries []domain.Industry) error {
	// Skip upserting the industries themselves; only the join rows change.
	if err := tx.Omit("Industries.*").Model(company).Association("Industries").Replace(industries); err != nil {
		return err
	}
	company.Industries = industries
	return nil
}

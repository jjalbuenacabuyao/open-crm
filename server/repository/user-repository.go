package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jjalbuenacabuyao/open-crm/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// EnsureUserParams carries the identity read off a verified Supabase token,
// plus the names to use if a local user has to be created.
type EnsureUserParams struct {
	SupabaseUserID string
	Email          string
	FirstName      string
	LastName       string
}

type UserRepository interface {
	FindBySupabaseID(ctx context.Context, supabaseUserID string) (*domain.User, error)

	// EnsureFromSupabase finds or creates the local user mirroring a Supabase
	// identity. It is idempotent and safe to call concurrently. The bool
	// reports whether a row was inserted by this call.
	EnsureFromSupabase(ctx context.Context, params EnsureUserParams) (*domain.User, bool, error)
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) FindBySupabaseID(ctx context.Context, supabaseUserID string) (*domain.User, error) {
	user, err := gorm.G[domain.User](r.db).Where("supabase_user_id = ?", supabaseUserID).First(ctx)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *userRepository) EnsureFromSupabase(ctx context.Context, params EnsureUserParams) (*domain.User, bool, error) {
	var (
		user    *domain.User
		created bool
	)

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// The common path: the identity is already linked, one indexed lookup.
		var linked domain.User
		err := tx.Where("supabase_user_id = ?", params.SupabaseUserID).First(&linked).Error
		if err == nil {
			user = &linked
			return nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		var byEmail domain.User
		err = tx.Unscoped().Where("email = ?", params.Email).First(&byEmail).Error
		switch {
		case err == nil && byEmail.DeletedAt.Valid:
			return ErrUserDeactivated

		case err == nil && byEmail.SupabaseUserID != nil:
			return ErrEmailTaken

		case err == nil:
			updates := map[string]any{"supabase_user_id": params.SupabaseUserID}
			if byEmail.FirstName == "" && params.FirstName != "" {
				updates["first_name"] = params.FirstName
			}
			if byEmail.LastName == "" && params.LastName != "" {
				updates["last_name"] = params.LastName
			}
			if err := tx.Model(&byEmail).Updates(updates).Error; err != nil {
				return err
			}
			user = &byEmail
			return nil

		case !errors.Is(err, gorm.ErrRecordNotFound):
			return err
		}

		id := uuid.New()
		fresh := domain.User{
			Base: domain.Base{
				ID:          id,
				CreatedByID: id,
			},
			FirstName:      params.FirstName,
			LastName:       params.LastName,
			Email:          params.Email,
			SupabaseUserID: &params.SupabaseUserID,
		}

		result := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "supabase_user_id"}},
			DoNothing: true,
		}).Create(&fresh)
		if result.Error != nil {
			return result.Error
		}

		if result.RowsAffected == 0 {
			// A concurrent request won the race — the client fires register and
			// me back to back. Re-read into a clean struct: reusing fresh would
			// let its populated primary key leak into the WHERE clause.
			var raced domain.User
			if err := tx.Where("supabase_user_id = ?", params.SupabaseUserID).First(&raced).Error; err != nil {
				return err
			}
			user = &raced
			return nil
		}

		created = true
		user = &fresh
		return nil
	})
	if err != nil {
		return nil, false, err
	}

	return user, created, nil
}

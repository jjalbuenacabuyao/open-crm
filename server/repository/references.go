package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ensureInWorkspace verifies that every non-nil ID names a live row of model in
// the given workspace. It is what stops a request from linking a record to a
// company or contact in someone else's workspace just by knowing its ID.
func ensureInWorkspace(tx *gorm.DB, model any, workspaceID uuid.UUID, ids ...*uuid.UUID) error {
	unique := make(map[uuid.UUID]struct{}, len(ids))
	for _, id := range ids {
		if id != nil {
			unique[*id] = struct{}{}
		}
	}
	if len(unique) == 0 {
		return nil
	}

	wanted := make([]uuid.UUID, 0, len(unique))
	for id := range unique {
		wanted = append(wanted, id)
	}

	var count int64
	err := tx.Model(model).
		Where("workspace_id = ? AND id IN ?", workspaceID, wanted).
		Count(&count).Error
	if err != nil {
		return err
	}
	if count != int64(len(wanted)) {
		return ErrInvalidReference
	}
	return nil
}

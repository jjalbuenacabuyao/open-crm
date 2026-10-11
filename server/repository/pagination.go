package repository

import (
	"strings"

	"gorm.io/gorm"
)

const (
	DefaultPageSize = 25
	MaxPageSize     = 200
)

// ListParams is the paging and free-text search shared by every list endpoint.
type ListParams struct {
	Query    string
	Page     int
	PageSize int
}

// Normalize clamps the paging values into range.
func (p ListParams) Normalize() ListParams {
	p.Query = strings.TrimSpace(p.Query)
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PageSize < 1 {
		p.PageSize = DefaultPageSize
	}
	if p.PageSize > MaxPageSize {
		p.PageSize = MaxPageSize
	}
	return p
}

// Page is one page of a list response. It is serialized as-is.
type Page[T any] struct {
	Items    []T   `json:"items"`
	Total    int64 `json:"total"`
	Page     int   `json:"page"`
	PageSize int   `json:"pageSize"`
}

// paginate counts the filtered query, then loads one page of it into a Page.
// query must already carry its filters; ordering and preloads are applied only
// to the page load, because they are meaningless (or invalid) inside COUNT.
func paginate[T any](query *gorm.DB, params ListParams, load func(*gorm.DB) *gorm.DB) (Page[T], error) {
	params = params.Normalize()
	page := Page[T]{Items: make([]T, 0), Page: params.Page, PageSize: params.PageSize}

	if err := query.Session(&gorm.Session{}).Count(&page.Total).Error; err != nil {
		return page, err
	}
	if page.Total == 0 {
		return page, nil
	}

	err := load(query.Session(&gorm.Session{})).
		Offset((params.Page - 1) * params.PageSize).
		Limit(params.PageSize).
		Find(&page.Items).Error
	return page, err
}

// likePattern turns user input into a substring ILIKE pattern, escaping the
// wildcard characters so a search for "50%" matches literally.
func likePattern(query string) string {
	escaped := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(query)
	return "%" + escaped + "%"
}

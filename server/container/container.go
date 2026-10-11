package container

import (
	"github.com/jjalbuenacabuyao/open-crm/config"
	"github.com/jjalbuenacabuyao/open-crm/handler"
	"github.com/jjalbuenacabuyao/open-crm/repository"
	"gorm.io/gorm"
)

// Container owns every long-lived dependency. It is built once at boot; the
// route layer reads handlers off it rather than constructing its own.
type Container struct {
	DB          *gorm.DB
	Supabase    config.Supabase
	CORSOrigins []string

	UserRepository repository.UserRepository

	AuthHandler      *handler.AuthHandler
	WorkspaceHandler *handler.WorkspaceHandler
	CompanyHandler   *handler.CompanyHandler
	ContactHandler   *handler.ContactHandler
	DealHandler      *handler.DealHandler
	IndustryHandler  *handler.IndustryHandler
	SourceHandler    *handler.SourceHandler
}

// New wires the dependency graph: database, then repositories, then handlers.
// Configuration loading here is total — validation is the caller's job, so this
// package never decides to terminate the process.
func New(db *gorm.DB) *Container {
	userRepository := repository.NewUserRepository(db)

	return &Container{
		DB:             db,
		Supabase:       config.LoadSupabase(),
		CORSOrigins:    config.LoadCORSOrigins(),
		UserRepository: userRepository,

		AuthHandler: handler.NewAuthHandler(userRepository),
		WorkspaceHandler: handler.NewWorkspaceHandler(
			repository.NewWorkspaceRepository(db),
			repository.NewStatsRepository(db),
		),
		CompanyHandler:  handler.NewCompanyHandler(repository.NewCompanyRepository(db)),
		ContactHandler:  handler.NewContactHandler(repository.NewContactRepository(db)),
		DealHandler:     handler.NewDealHandler(repository.NewDealRepository(db)),
		IndustryHandler: handler.NewIndustryHandler(repository.NewIndustryRepository(db)),
		SourceHandler:   handler.NewSourceHandler(repository.NewSourceRepository(db)),
	}
}

import { Link, useMatches } from '@tanstack/react-router'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '#/components/ui/breadcrumb.tsx'
import { Separator } from '#/components/ui/separator.tsx'
import { SidebarTrigger } from '#/components/ui/sidebar.tsx'

/**
 * The bar above the routed page: sidebar toggle, then a breadcrumb whose last
 * crumb is the current route's `staticData.title`. Routes that declare no title
 * simply show the app crumb alone.
 */
export function SiteHeader() {
  const matches = useMatches()
  // Deepest match wins. Reversed rather than `findLast`, which needs lib ES2023.
  const title = [...matches].reverse().find((match) => match.staticData.title)
    ?.staticData.title

  return (
    <header className="flex h-16 shrink-0 items-center gap-2">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden sm:block">
              <BreadcrumbLink asChild>
                <Link to="/">open-crm</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {title ? (
              <>
                <BreadcrumbSeparator className="hidden sm:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{title}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : null}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}

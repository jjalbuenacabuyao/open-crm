import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '#/components/ui/sidebar.tsx'
import { NavMain } from '#/components/layout/nav-main.tsx'
import { NavSecondary } from '#/components/layout/nav-secondary.tsx'
import { NavUser } from '#/components/layout/nav-user.tsx'
import { WorkspaceSwitcher } from '#/components/layout/workspace-switcher.tsx'
import { NAV_MAIN, NAV_SECONDARY } from '#/components/layout/nav-data.ts'

import type { ComponentProps } from 'react'

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={NAV_MAIN} />
        <NavSecondary items={NAV_SECONDARY} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

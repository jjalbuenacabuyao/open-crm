import { Link } from '@tanstack/react-router'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '#/components/ui/sidebar.tsx'

import type { ComponentProps } from 'react'
import type { NavItem } from '#/components/layout/nav-data.ts'

/** Support links, pinned to the bottom of the sidebar by the caller's `mt-auto`. */
export function NavSecondary({
  items,
  ...props
}: { items: NavItem[] } & ComponentProps<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const Icon = item.icon

            return (
              <SidebarMenuItem key={item.title}>
                {item.to ? (
                  <SidebarMenuButton asChild size="sm" tooltip={item.title}>
                    <Link to={item.to}>
                      <Icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    type="button"
                    size="sm"
                    tooltip={item.title}
                  >
                    <Icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

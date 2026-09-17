import { Link, useMatchRoute } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible.tsx'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '#/components/ui/sidebar.tsx'

import type { NavItem, NavLink } from '#/components/layout/nav-data.ts'

/**
 * The primary sections. An item with `to` is a real link; one without renders
 * with the same styling but does not navigate, because the route does not exist
 * yet and a link into nothing would land the user on a not-found page.
 */
export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible key={item.title} asChild>
            <SidebarMenuItem>
              <NavMainButton item={item} />

              {item.items ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction
                      className="data-[state=open]:rotate-90"
                      aria-label={`Toggle ${item.title}`}
                    >
                      <ChevronRight />
                    </SidebarMenuAction>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <NavMainSubButton item={subItem} />
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : null}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function NavMainButton({ item }: { item: NavItem }) {
  const matchRoute = useMatchRoute()
  const Icon = item.icon

  if (!item.to) {
    return (
      <SidebarMenuButton type="button" tooltip={item.title}>
        <Icon />
        <span>{item.title}</span>
      </SidebarMenuButton>
    )
  }

  // Exact for "/", which would otherwise prefix-match every route in the app.
  const isActive = Boolean(matchRoute({ to: item.to, fuzzy: item.to !== '/' }))

  return (
    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
      <Link to={item.to}>
        <Icon />
        <span>{item.title}</span>
      </Link>
    </SidebarMenuButton>
  )
}

function NavMainSubButton({ item }: { item: NavLink }) {
  // Renders as an anchor with no href: present and styled, but not a link.
  if (!item.to) {
    return <SidebarMenuSubButton>{item.title}</SidebarMenuSubButton>
  }

  return (
    <SidebarMenuSubButton asChild>
      <Link to={item.to}>{item.title}</Link>
    </SidebarMenuSubButton>
  )
}

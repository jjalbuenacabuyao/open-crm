import {
  Briefcase,
  Building2,
  Handshake,
  LayoutDashboard,
  LifeBuoy,
  ListTodo,
  Send,
  Target,
  Users,
} from 'lucide-react'

import type { LinkProps } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'

/**
 * Navigation config for the sidebar.
 *
 * Only `/` is routed today. `to` is typed against the generated route tree, so
 * an entry cannot point at a path that does not exist — the rest are the
 * intended CRM sections and render as non-navigating rows until their features
 * land. Give one a `to` the moment its route file appears.
 */

export interface NavLink {
  title: string
  to?: LinkProps['to']
}

export interface NavItem extends NavLink {
  icon: LucideIcon
  items?: NavLink[]
}

export const NAV_MAIN: NavItem[] = [
  { title: 'Dashboard', to: '/', icon: LayoutDashboard },
  {
    title: 'Contacts',
    icon: Users,
    items: [{ title: 'All contacts' }, { title: 'Segments' }],
  },
  {
    title: 'Companies',
    icon: Building2,
    items: [{ title: 'All companies' }, { title: 'Industries' }],
  },
  {
    title: 'Deals',
    icon: Handshake,
    items: [{ title: 'Pipeline' }, { title: 'Forecast' }],
  },
  { title: 'Tasks', icon: ListTodo },
]

export const NAV_SECONDARY: NavItem[] = [
  { title: 'Support', icon: LifeBuoy },
  { title: 'Feedback', icon: Send },
]

/**
 * Placeholder until workspaces are fetched from the API. `domain.Workspace`
 * already exists server-side and is migrated; there is no endpoint for it yet.
 */
export const WORKSPACES: NavItem[] = [
  { title: 'Sales', icon: Briefcase },
  { title: 'Partnerships', icon: Handshake },
  { title: 'Success', icon: Target },
]

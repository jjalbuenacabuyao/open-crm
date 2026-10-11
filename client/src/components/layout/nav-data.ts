import {
  Building2,
  Handshake,
  LayoutDashboard,
  LifeBuoy,
  ListTodo,
  Send,
  Settings,
  Users,
} from 'lucide-react'

import type { LinkProps } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'

/**
 * Navigation config for the sidebar.
 *
 * `to` is typed against the generated route tree, so an entry cannot point at
 * a path that does not exist. Entries without one are planned sections that
 * render as non-navigating rows until their features land — give one a `to`
 * the moment its route file appears.
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
    to: '/contacts',
    icon: Users,
    items: [{ title: 'All contacts', to: '/contacts' }, { title: 'Segments' }],
  },
  {
    title: 'Companies',
    to: '/companies',
    icon: Building2,
    items: [
      { title: 'All companies', to: '/companies' },
      { title: 'Industries', to: '/settings' },
    ],
  },
  {
    title: 'Deals',
    to: '/deals',
    icon: Handshake,
    items: [{ title: 'Pipeline', to: '/deals' }, { title: 'Forecast' }],
  },
  { title: 'Tasks', icon: ListTodo },
]

export const NAV_SECONDARY: NavItem[] = [
  { title: 'Settings', to: '/settings', icon: Settings },
  { title: 'Support', icon: LifeBuoy },
  { title: 'Feedback', icon: Send },
]

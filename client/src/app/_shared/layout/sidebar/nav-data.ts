/**
 * Navigation config for the sidebar.
 *
 * Only `/` is routed today; the rest are the intended CRM sections and fall
 * through to the wildcard redirect until their features land.
 */

export interface NavLink {
  title: string;
  url: string;
}

export interface NavItem extends NavLink {
  /** A lucide icon name registered via provideIcons on the consuming component. */
  icon: string;
  items?: NavLink[];
}

export interface WorkspaceItem extends NavLink {
  icon: string;
}

export const NAV_MAIN: NavItem[] = [
  { title: 'Dashboard', url: '/', icon: 'lucideLayoutDashboard' },
  {
    title: 'Contacts',
    url: '/contacts',
    icon: 'lucideUsers',
    items: [
      { title: 'All contacts', url: '/contacts' },
      { title: 'Segments', url: '/contacts/segments' },
    ],
  },
  {
    title: 'Companies',
    url: '/companies',
    icon: 'lucideBuilding2',
    items: [
      { title: 'All companies', url: '/companies' },
      { title: 'Industries', url: '/companies/industries' },
    ],
  },
  {
    title: 'Deals',
    url: '/deals',
    icon: 'lucideHandshake',
    items: [
      { title: 'Pipeline', url: '/deals' },
      { title: 'Forecast', url: '/deals/forecast' },
    ],
  },
  { title: 'Tasks', url: '/tasks', icon: 'lucideListTodo' },
];

export const NAV_SECONDARY: NavItem[] = [
  { title: 'Support', url: '/support', icon: 'lucideLifeBuoy' },
  { title: 'Feedback', url: '/feedback', icon: 'lucideSend' },
];

// Placeholder until workspaces are fetched from the API. domain.Workspace
// already exists server-side; there is no endpoint for it yet.
export const WORKSPACES: WorkspaceItem[] = [
  { title: 'Sales', url: '/workspaces/sales', icon: 'lucideBriefcase' },
  { title: 'Partnerships', url: '/workspaces/partnerships', icon: 'lucideHandshake' },
  { title: 'Success', url: '/workspaces/success', icon: 'lucideTarget' },
];

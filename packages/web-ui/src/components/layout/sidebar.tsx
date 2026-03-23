import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Trophy,
  ListOrdered,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/standings', icon: Trophy, label: 'Standings' },
  { to: '/rounds', icon: ListOrdered, label: 'Rounds' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/config', icon: Settings, label: 'Config' },
];

export function Sidebar() {
  return (
    <aside className="flex w-56 flex-col border-r border-border bg-card px-3 py-4">
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-l-2 border-primary bg-accent text-accent-foreground'
                  : 'border-l-2 border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

import { Settings, BarChart3, Bell, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export function SidebarNav() {
  return (
    <nav className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <ul className="space-y-2">
        <li>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition text-sm ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground'
              }`
            }
          >
            <User className="h-5 w-5" />
            <span className="font-medium">Profile</span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition text-sm ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground'
              }`
            }
          >
            <Bell className="h-5 w-5" />
            <span className="font-medium">Notifications</span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition text-sm ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground'
              }`
            }
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">Settings</span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition text-sm ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground'
              }`
            }
          >
            <BarChart3 className="h-5 w-5" />
            <span className="font-medium">Analytics</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

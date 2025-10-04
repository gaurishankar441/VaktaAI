import { ReactNode, useState } from 'react';
import NavigationRail from './navigation-rail';
import QuickActionsDrawer from './quick-actions-drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCommandK = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      // TODO: Open command palette modal
      console.log('Command palette triggered');
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left Navigation Rail */}
      <NavigationRail />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            {/* Search / Command Palette */}
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search or press Cmd+K..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border-border focus:border-primary pr-20"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                    e.preventDefault();
                    console.log('Command palette triggered');
                  }
                }}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Badge variant="secondary" className="px-1 py-0 text-xs">
                  ⌘
                </Badge>
                <Badge variant="secondary" className="px-1 py-0 text-xs">
                  K
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Streak Indicator */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 border border-orange-200">
              <i className="fas fa-fire text-orange-500"></i>
              <span className="text-sm font-semibold text-orange-700">12 days</span>
            </div>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <i className="fas fa-bell text-muted-foreground"></i>
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
            </Button>

            {/* Quick Actions Drawer Toggle */}
            <Button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="bg-primary hover:bg-primary/90"
              size="icon"
            >
              <i className="fas fa-bolt text-primary-foreground"></i>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>

      {/* Right Quick Actions Drawer */}
      {showQuickActions && (
        <QuickActionsDrawer onClose={() => setShowQuickActions(false)} />
      )}
    </div>
  );
}

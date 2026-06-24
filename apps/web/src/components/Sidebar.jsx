import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, FileText, Target, BarChart3, TrendingUp, Download, Building2, MessageSquare as MessageSquareText, SearchCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/overview', icon: LayoutDashboard, label: 'Overview' },
  { to: '/briefs', icon: FileText, label: 'Lead Queue' },
  { to: '/qualify', icon: SearchCheck, label: 'Quick Qualify' },
  { to: '/feedback', icon: MessageSquareText, label: 'Feedback' },
  { to: '/analytics', icon: TrendingUp, label: 'Analytics' },
  { to: '/icp-profile', icon: Target, label: 'ICP Profile' },
  { to: '/client-context', icon: Building2, label: 'Client Context' },
];

const Sidebar = ({ isOpen, onClose }) => {
  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 border-r border-sidebar-border bg-sidebar-background text-sidebar-foreground transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-sidebar-border lg:hidden">
          <span className="text-lg font-semibold">Menu</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("h-5 w-5", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60")} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;

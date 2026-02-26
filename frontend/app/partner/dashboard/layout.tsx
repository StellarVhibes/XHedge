"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Settings, 
  LogOut, 
  Menu,
  X,
  Shield,
  Activity,
  DollarSign,
  PieChart
} from "lucide-react";
import { usePartnerAuth } from "@/app/context/PartnerAuthContext";
import { PartnerGuard } from "@/components/PartnerGuard";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  {
    name: "Overview",
    href: "/partner/dashboard",
    icon: BarChart3,
    permission: "view_metrics",
  },
  {
    name: "Performance",
    href: "/partner/dashboard/performance",
    icon: TrendingUp,
    permission: "view_analytics",
  },
  {
    name: "Users",
    href: "/partner/dashboard/users",
    icon: Users,
    permission: "manage_users",
  },
  {
    name: "Analytics",
    href: "/partner/dashboard/analytics",
    icon: PieChart,
    permission: "view_analytics",
  },
  {
    name: "Activity",
    href: "/partner/dashboard/activity",
    icon: Activity,
    permission: "view_metrics",
  },
  {
    name: "Settings",
    href: "/partner/dashboard/settings",
    icon: Settings,
    permission: "view_metrics",
  },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { partner, logout } = usePartnerAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push("/partner/login");
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'analyst':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <PartnerGuard>
      <div className="min-h-screen bg-background">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex h-16 items-center justify-between px-6 border-b">
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <span className="font-semibold">Partner Portal</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const hasPermission = partner?.permissions.includes(item.permission);
                
                if (!hasPermission) return null;

                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      router.push(item.href);
                      setSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </button>
                );
              })}
            </nav>

            {/* User Info & Logout */}
            <div className="border-t p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{partner?.name}</span>
                  <Badge className={getRoleColor(partner?.role || '')}>
                    {partner?.role}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {partner?.organization}
                </div>
                <div className="text-xs text-muted-foreground">
                  {partner?.email}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:pl-64">
          {/* Top Bar */}
          <div className="sticky top-0 z-30 flex h-16 items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 lg:px-8">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Partner Dashboard
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="hidden sm:inline-flex">
                <DollarSign className="h-3 w-3 mr-1" />
                Ecosystem Partner
              </Badge>
            </div>
          </div>

          {/* Page Content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </PartnerGuard>
  );
}

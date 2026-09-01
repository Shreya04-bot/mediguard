import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, Search, Moon, Sun, ChevronRight, Home } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { getInitials } from "@/lib/utils";

function getBreadcrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  return parts.map((part, i) => ({
    label: part.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    href: "/" + parts.slice(0, i + 1).join("/"),
  }));
}

export function DashboardNavbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const breadcrumbs = getBreadcrumbs(location.pathname);
  const roleColors = {
    admin: "from-violet-500 to-purple-600",
    doctor: "from-blue-500 to-cyan-600",
    patient: "from-emerald-500 to-teal-600",
  };
  const roleColor = user ? roleColors[user.role] : "from-blue-500 to-cyan-600";

  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-30 flex items-center px-4 gap-4">
      <SidebarTrigger className="size-8" />
      <Separator orientation="vertical" className="h-4" />

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground overflow-hidden">
        <Link to="/" className="hover:text-foreground transition-colors" aria-label="Home">
          <Home className="size-3.5" aria-hidden="true" />
        </Link>
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1">
            <ChevronRight className="size-3 shrink-0" />
            {i === breadcrumbs.length - 1 ? (
              <span className="text-foreground font-medium truncate max-w-32">{crumb.label}</span>
            ) : (
              <Link to={crumb.href} className="hover:text-foreground transition-colors truncate max-w-24">{crumb.label}</Link>
            )}
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {/* Search */}
        <AnimatePresence>
          {searchOpen ? (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 220, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="overflow-hidden">
              <Input placeholder="Search..." aria-label="Search" className="h-8 text-sm" autoFocus onBlur={() => setSearchOpen(false)} />
            </motion.div>
          ) : (
            <Button variant="ghost" size="icon-sm" onClick={() => setSearchOpen(true)} aria-label="Open search">
              <Search className="size-4" aria-hidden="true" />
            </Button>
          )}
        </AnimatePresence>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="relative" aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}>
              <Bell className="size-4" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center font-bold" aria-hidden="true">{unreadCount}</span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              <Badge variant="secondary">{unreadCount} new</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">You're all caught up.</div>
            ) : (
              notifications.slice(0, 4).map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  className="flex flex-col items-start gap-1 py-3"
                  onSelect={(e) => {
                    e.preventDefault();
                    if (!n.read) markAsRead(n.id);
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-sm font-medium ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.message ?? n.title}</span>
                    {!n.read && <span className="size-2 rounded-full bg-primary shrink-0 ml-2" />}
                  </div>
                  <span className="text-xs text-muted-foreground">{n.time}</span>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={`/dashboard/${user?.role}/notifications`} className="justify-center text-sm text-primary font-medium">
                View all notifications
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 gap-2 px-2">
              <ProfileAvatar user={user} className="h-6 w-6" />
              <span className="hidden sm:block text-sm font-medium max-w-24 truncate">{user?.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link to={`/dashboard/${user?.role}/profile`}>Profile</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to={`/dashboard/${user?.role}/settings`}>Settings</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

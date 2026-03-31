import { LayoutDashboard, Bell, Archive, Radar, Settings, LogOut, User, CreditCard, Search, Sun, Moon } from "lucide-react";
import Logo from "@/components/Logo";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "./NotificationBell";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AppSidebarProps {
  unreadCount?: number;
}

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "Briefs Archive", url: "/archive", icon: Archive },
  { title: "Sources", url: "/sources", icon: Radar },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar({ unreadCount = 0 }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "U";
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const userEmail = user?.email ?? "";

  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem("ruleshift-theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("ruleshift-theme", isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <Sidebar
      collapsible="icon"
      className="hidden md:flex transition-all duration-300 ease-in-out sidebar-gradient border-r border-border/50"
    >
      <SidebarHeader className="p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <Logo size={collapsed ? "sm" : "md"} />
        </div>
        {!collapsed && <div className="h-px bg-border/50" />}
        {!collapsed && (
          <button
            onClick={() => {
              document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
            }}
            className="flex w-full items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono border border-border">⌘K</kbd>
          </button>
        )}
        {collapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
                }}
                className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted transition-colors"
              >
                <Search className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Search (⌘K)</TooltipContent>
          </Tooltip>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <NavLink
                            to={item.url}
                            end={item.url === "/dashboard"}
                            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200 hover:scale-[1.01]"
                            activeClassName="bg-secondary/10 text-secondary border-l-[3px] border-secondary font-semibold"
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                          </NavLink>
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.title}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200 hover:scale-[1.01]"
                        activeClassName="bg-secondary/10 text-secondary border-l-[3px] border-secondary font-semibold"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 flex items-center justify-between">
                          {item.title}
                          {item.title === "Alerts" && unreadCount > 0 && (
                            <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] px-1.5 text-[10px] animate-[pulse-ring_2s_infinite]">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </Badge>
                          )}
                        </span>
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <Badge variant="secondary" className="text-xs">Professional</Badge>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsDark((d) => !d)}
              className="relative h-8 w-8 rounded-lg flex items-center justify-center hover:bg-sidebar-accent transition-colors overflow-hidden"
              aria-label="Toggle dark mode"
            >
              <Sun className={`h-4 w-4 absolute transition-all duration-300 ${isDark ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"}`} />
              <Moon className={`h-4 w-4 absolute transition-all duration-300 ${isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"}`} />
            </button>
            <NotificationBell />
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 rounded-lg p-2 text-sm hover:bg-sidebar-accent transition-colors">
              <Avatar className="h-7 w-7 ring-2 ring-secondary/30">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="truncate text-sidebar-foreground font-medium text-sm leading-tight">{displayName}</span>
                  <span className="truncate text-[11px] text-muted-foreground leading-tight">{userEmail}</span>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-48">
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <User className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <CreditCard className="mr-2 h-4 w-4" /> Billing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

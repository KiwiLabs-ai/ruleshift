import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MobileTopBar } from "./MobileTopBar";
import { CommandPalette } from "./CommandPalette";

interface DashboardLayoutProps {
  children: ReactNode;
  unreadCount?: number;
}

export function DashboardLayout({ children, unreadCount }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar unreadCount={unreadCount} />
        <div className="flex-1 flex flex-col min-w-0">
          <MobileTopBar />
          <main className="flex-1 overflow-auto bg-muted/30 p-4 md:p-6">
            <div className="animate-[content-fade-in_300ms_ease-out_both]">
              {children}
            </div>
          </main>
        </div>
      </div>
      <CommandPalette />
    </SidebarProvider>
  );
}

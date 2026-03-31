import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "./NotificationBell";
import Logo from "@/components/Logo";

interface MobileTopBarProps {
  onOpenSearch?: () => void;
}

export function MobileTopBar({ onOpenSearch }: MobileTopBarProps) {
  return (
    <header className="flex md:hidden items-center justify-between border-b border-border bg-card px-3 h-14 shrink-0">
      <SidebarTrigger />
      <Logo size="sm" />
      <div className="flex items-center gap-1">
        <NotificationBell />
      </div>
    </header>
  );
}

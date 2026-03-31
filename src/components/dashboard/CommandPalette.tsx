import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Bell,
  Archive,
  Radar,
  Settings,
  User,
  CreditCard,
  Plug,
  ScrollText,
  Search,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";

const pages = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Alerts", icon: Bell, path: "/alerts" },
  { label: "Briefs Archive", icon: Archive, path: "/archive" },
  { label: "Sources", icon: Radar, path: "/sources" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

const settingsTabs = [
  { label: "Profile Settings", icon: User, path: "/settings" },
  { label: "Organization Settings", icon: Settings, path: "/settings" },
  { label: "Notification Settings", icon: Bell, path: "/settings" },
  { label: "Billing", icon: CreditCard, path: "/settings" },
  { label: "Integrations", icon: Plug, path: "/settings" },
  { label: "Audit Log", icon: ScrollText, path: "/settings" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, alerts, settings..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {pages.map((p) => (
            <CommandItem key={p.path} onSelect={() => go(p.path)}>
              <p.icon className="mr-2 h-4 w-4" />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          {settingsTabs.map((s) => (
            <CommandItem key={s.label} onSelect={() => go(s.path)}>
              <s.icon className="mr-2 h-4 w-4" />
              {s.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

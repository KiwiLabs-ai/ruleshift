import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Features", href: "#pain-points" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-primary/80 backdrop-blur-xl backdrop-saturate-150 shadow-lg border-b border-primary-foreground/5"
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <a href="#" className="group flex items-center gap-2 text-primary-foreground">
          <Logo size="md" />
        </a>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="nav-link relative text-sm font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10" asChild>
            <Link to="/login">Log In</Link>
          </Button>
          <Button
            className="bg-secondary text-secondary-foreground hover:bg-teal-light shadow-[0_0_16px_rgba(42,161,152,0.3)] hover:shadow-[0_0_24px_rgba(42,161,152,0.5)] transition-shadow"
            asChild
          >
            <Link to="/signup">Sign Up</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          className="text-primary-foreground md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "overflow-hidden border-t border-primary-foreground/10 bg-primary/95 backdrop-blur-xl px-4 md:hidden transition-all duration-300 ease-in-out",
          mobileOpen ? "max-h-96 opacity-100 pb-6 pt-2" : "max-h-0 opacity-0 pb-0 pt-0 border-t-0"
        )}
      >
        {navLinks.map((l) => (
          <a
            key={l.href}
            href={l.href}
            onClick={() => setMobileOpen(false)}
            className="block py-3 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground"
          >
            {l.label}
          </a>
        ))}
        <div className="mt-4 flex flex-col gap-2">
          <Button variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
            <Link to="/login">Log In</Link>
          </Button>
          <Button className="bg-secondary text-secondary-foreground hover:bg-teal-light" asChild>
            <Link to="/signup">Sign Up</Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

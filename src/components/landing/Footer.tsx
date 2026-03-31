import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Logo from "@/components/Logo";

const Footer = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/signup?email=${encodeURIComponent(email)}`);
  };

  return (
    <>
      {/* Pre-Footer CTA Band */}
      <section className="gradient-navy py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-primary-foreground sm:text-3xl">
              Ready to Stop Losing Sleep Over Compliance?
            </h2>
            <p className="mt-4 text-primary-foreground/70">
              Join 100+ businesses that get policy intelligence delivered automatically.
            </p>

            <form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-md flex-col gap-2 sm:flex-row sm:gap-0">
              <Input
                type="email"
                placeholder="Enter your work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/40 rounded-lg sm:rounded-r-none sm:rounded-l-lg focus-visible:ring-secondary"
              />
              <Button
                type="submit"
                className="bg-secondary text-secondary-foreground hover:bg-teal-light rounded-lg sm:rounded-l-none sm:rounded-r-lg whitespace-nowrap px-6"
              >
                Get Started Free →
              </Button>
            </form>

            <p className="mt-3 text-xs text-primary-foreground/50">
              Free 14-day trial. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="gradient-navy border-t border-primary-foreground/10 py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
            {/* Brand */}
            <div>
              <Logo size="sm" />
              <p className="mt-3 text-sm text-primary-foreground/50">
                Policy intelligence for modern businesses.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground">Product</h4>
              <ul className="space-y-2">
                <li><a href="#pain-points" className="text-sm text-primary-foreground/50 transition-colors hover:text-primary-foreground">Features</a></li>
                <li><a href="#how-it-works" className="text-sm text-primary-foreground/50 transition-colors hover:text-primary-foreground">How It Works</a></li>
                <li><a href="#pricing" className="text-sm text-primary-foreground/50 transition-colors hover:text-primary-foreground">Pricing</a></li>
                <li><a href="#" className="text-sm text-primary-foreground/50 transition-colors hover:text-primary-foreground">Sample Brief</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-primary-foreground/50 transition-colors hover:text-primary-foreground">About</a></li>
                <li><a href="#" className="text-sm text-primary-foreground/50 transition-colors hover:text-primary-foreground">Blog</a></li>
                <li><a href="#" className="text-sm text-primary-foreground/50 transition-colors hover:text-primary-foreground">Careers</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground">Legal</h4>
              <ul className="space-y-2">
                <li><a href="/privacy" className="text-sm text-primary-foreground/50 transition-colors hover:text-primary-foreground">Privacy Policy</a></li>
                <li><a href="/terms" className="text-sm text-primary-foreground/50 transition-colors hover:text-primary-foreground">Terms of Service</a></li>
                <li><a href="#" className="text-sm text-primary-foreground/50 transition-colors hover:text-primary-foreground">Security</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-primary-foreground/10 pt-6 text-center text-xs text-primary-foreground/40">
            © {new Date().getFullYear()} RuleShift. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;

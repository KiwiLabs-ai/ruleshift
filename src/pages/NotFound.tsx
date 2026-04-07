import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Shield, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const NotFound = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Page Not Found — RuleShift";
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(var(--primary)/0.9)] to-[hsl(var(--secondary)/0.6)] p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-card/80 p-10 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="rounded-full bg-secondary/20 p-5">
            <Shield className="h-10 w-10 text-secondary" />
          </div>
          <div>
            <h1 className="text-7xl font-extrabold text-foreground tracking-tight">404</h1>
            <h2 className="mt-3 text-xl font-semibold text-foreground">Page not found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            {user ? (
              <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
                <Link to="/dashboard" className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Go to Dashboard
                </Link>
              </Button>
            ) : (
              <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
                <Link to="/" className="gap-2">
                  <Home className="h-4 w-4" /> Go to Home
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

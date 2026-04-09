import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getPasswordStrength, isWeakPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for recovery via router state (from AuthContext) or URL hash (direct link)
    const fromState = (location.state as { recovery?: boolean })?.recovery;
    const fromHash = window.location.hash.includes("type=recovery");
    if (fromState || fromHash) {
      setReady(true);
    }
  }, [location.state]);

  const strength = getPasswordStrength(password);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast({
        variant: "destructive",
        title: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
      return;
    }
    if (isWeakPassword(password)) {
      toast({
        variant: "destructive",
        title: "Password is too common. Please choose a stronger password.",
      });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      console.error("[reset-password] updateUser failed:", error.message);
      toast({
        variant: "destructive",
        title: "Couldn't update password",
        description: "Please try again or request a new reset link.",
      });
    } else {
      toast({ title: "Password updated successfully!" });
      navigate("/login");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center gradient-navy px-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-center">
          <Logo size="lg" />
        </div>
        <h1 className="text-center text-2xl font-bold text-card-foreground">Set New Password</h1>

        {!ready ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Invalid or expired reset link. Please request a new one.
          </p>
        ) : (
          <form onSubmit={handleUpdate} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`Min ${MIN_PASSWORD_LENGTH} characters`}
              />
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${strength.color}`}
                      style={{ width: strength.width }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{strength.label}</p>
                </div>
              )}
            </div>
            <Button type="submit" className="w-full bg-secondary text-secondary-foreground hover:bg-teal-light" disabled={loading}>
              {loading ? "Updating…" : "Update Password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;

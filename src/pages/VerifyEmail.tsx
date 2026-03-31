import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Loader2, CheckCircle2, XCircle } from "lucide-react";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const VerifyEmail = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<"verified" | "not_verified" | null>(null);

  const email = user?.email ?? "";

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) {
      toast({ variant: "destructive", title: "Could not resend", description: error.message });
    } else {
      toast({ title: "Verification email sent", description: "Check your inbox for a new link." });
    }
  };

  const handleCheckVerification = async () => {
    setChecking(true);
    setCheckResult(null);

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      setChecking(false);
      setCheckResult("not_verified");
      return;
    }

    if (data.user.email_confirmed_at) {
      setCheckResult("verified");
      setChecking(false);
      // Short delay for the success state to show
      setTimeout(() => navigate("/onboarding/company", { replace: true }), 800);
    } else {
      setChecking(false);
      setCheckResult("not_verified");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center gradient-mesh px-4 overflow-hidden animate-[auth-fade-in_500ms_ease-out_both]">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-glow-teal/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-navy-dark/40 blur-3xl rounded-full pointer-events-none" />

      <div className="auth-card w-full max-w-md rounded-3xl bg-card/80 backdrop-blur-sm ring-1 ring-white/5 p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 auth-dots pointer-events-none" />

        <div className="relative z-10 text-center">
          {/* Logo */}
          <div className="mb-6 flex items-center justify-center">
            <Logo size="lg" />
          </div>

          {/* Mail icon */}
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-secondary/10 ring-4 ring-secondary/10">
            <Mail className="h-10 w-10 text-secondary" />
          </div>

          <h1 className="text-2xl font-bold text-card-foreground">Please verify your email</h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto">
            We sent a verification link to{" "}
            <strong className="text-foreground">{email || "your email"}</strong>.
            Click the link in your email to continue.
          </p>

          {/* Status feedback */}
          {checkResult === "verified" && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-secondary">
              <CheckCircle2 className="h-4 w-4" />
              Verified! Redirecting…
            </div>
          )}
          {checkResult === "not_verified" && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-destructive">
              <XCircle className="h-4 w-4" />
              Not verified yet. Please check your email and try again.
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 space-y-3">
            <Button
              onClick={handleCheckVerification}
              disabled={checking}
              className="w-full bg-secondary text-secondary-foreground hover:bg-teal-light"
            >
              {checking ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking…</>
              ) : (
                "I've verified — continue"
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleResend}
              disabled={resending}
              className="w-full"
            >
              {resending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
              ) : (
                "Resend verification email"
              )}
            </Button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Didn't receive the email? Check your spam folder or try resending.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

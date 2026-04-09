import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Clock, ShieldCheck } from "lucide-react";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getPasswordStrength, isWeakPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";

const Signup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const strength = getPasswordStrength(password);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || password.length < MIN_PASSWORD_LENGTH) {
      toast({ variant: "destructive", title: `Please fill all fields (password min ${MIN_PASSWORD_LENGTH} chars).` });
      return;
    }
    if (isWeakPassword(password)) {
      toast({ variant: "destructive", title: "Password is too common. Please choose a stronger password." });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      // Log for debugging but don't leak specifics via the UI — account
      // enumeration oracle.
      console.error("[signup] signUp failed:", error.message);
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: "Please try again in a moment.",
      });
      return;
    }
    // Always show the same "check your email" state regardless of whether
    // this is a brand-new account or an attempt to sign up with a
    // pre-existing email. Supabase returns data.user with an empty
    // identities array in the latter case; branching on that would let
    // anyone enumerate registered accounts. The verification email will
    // tell the legitimate owner what to do.
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center gradient-mesh px-4 overflow-hidden animate-[auth-fade-in_500ms_ease-out_both]">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-glow-teal/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-navy-dark/40 blur-3xl rounded-full pointer-events-none" />
        <div className="auth-card w-full max-w-md rounded-3xl bg-card/80 backdrop-blur-sm ring-1 ring-white/5 p-8 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute inset-0 auth-dots pointer-events-none" />
          <div className="relative z-10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
              <Logo size="md" />
            </div>
            <h1 className="text-2xl font-bold text-card-foreground">Check your email</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              We sent a verification link to <strong>{email}</strong>. Click the link to activate your account.
            </p>
            <Button variant="outline" className="mt-6" onClick={() => navigate("/verify-email", { state: { email } })}>
              I've verified my email
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center gradient-mesh px-4 overflow-hidden animate-[auth-fade-in_500ms_ease-out_both]">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-glow-teal/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-navy-dark/40 blur-3xl rounded-full pointer-events-none" />

      <div className="auth-card w-full max-w-md rounded-3xl bg-card/80 backdrop-blur-sm ring-1 ring-white/5 p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 auth-dots pointer-events-none" />

        <div className="relative z-10">
          <div className="mb-6 flex items-center justify-center">
            <Logo size="lg" />
          </div>
          <h1 className="text-center text-2xl font-bold text-card-foreground">Start Your Free Trial</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">14 days free, then your plan starts automatically.</p>

          <form onSubmit={handleSignup} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" className="auth-input" />
            </div>
            <div>
              <Label htmlFor="email">Work Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" className="auth-input" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="auth-input"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: strength.width }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{strength.label}</p>
                </div>
              )}
            </div>
            <Button type="submit" className="w-full bg-secondary text-secondary-foreground hover:bg-teal-light" disabled={loading}>
              {loading ? "Creating Account…" : "Create Account"}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              By signing up, you agree to our{" "}
              <Link to="/terms" className="text-secondary hover:underline">Terms of Service</Link>
              {" "}and{" "}
              <Link to="/privacy" className="text-secondary hover:underline">Privacy Policy</Link>.
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-secondary hover:underline">Log in</Link>
          </p>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Join 100+ businesses monitoring policy changes
          </p>

          {/* Trust signals */}
          <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-primary-foreground/40">
            <span className="flex items-center gap-1"><Lock className="h-3 w-3" />256-bit encryption</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Setup in under 2 min</span>
            <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" />SOC 2 compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;

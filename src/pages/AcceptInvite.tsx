import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, UserPlus, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { apiCall } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";

type InviteInfo = {
  id: string;
  organization_id: string;
  organization_name: string;
  role: string;
};

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const invitedEmail = searchParams.get("email") ?? "";
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Signup state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Invite check state
  const [inviteLoading, setInviteLoading] = useState(false);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [inviteChecked, setInviteChecked] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState(false);

  // When user is logged in, check for pending invite
  useEffect(() => {
    if (authLoading || !user) return;
    checkInvite();
  }, [user, authLoading]);

  const checkInvite = async () => {
    setInviteLoading(true);
    try {
      const { data, error } = await apiCall("manage-team", { action: "check_invite" });
      if (error) throw new Error(error);
      if (data.found) {
        setInvite(data.invite);
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to check invitation",
        description: err?.message ?? "Please try again.",
      });
    } finally {
      setInviteLoading(false);
      setInviteChecked(true);
    }
  };

  const handleAccept = async () => {
    if (!invite) return;
    setAcceptLoading(true);
    try {
      const { data, error } = await apiCall("manage-team", { action: "accept_invite", invite_id: invite.id });
      if (error) throw new Error(error);
      if (data.error) throw new Error(data.error);
      toast({ title: "Welcome to the team!", description: `You've joined ${invite.organization_name}.` });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to accept invite", description: err.message });
    } finally {
      setAcceptLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      toast({ variant: "destructive", title: "Please fill all fields (password min 6 chars)." });
      return;
    }
    setSignupLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/accept-invite?email=${encodeURIComponent(email.trim())}`,
      },
    });
    setSignupLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Signup failed", description: error.message });
    } else {
      setSignupSuccess(true);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  // ── Logged-in user flow ──
  if (user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center gradient-mesh px-4 overflow-hidden animate-[auth-fade-in_500ms_ease-out_both]">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-glow-teal/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-navy-dark/40 blur-3xl rounded-full pointer-events-none" />

        <div className="auth-card w-full max-w-md rounded-3xl bg-card/80 backdrop-blur-sm ring-1 ring-white/5 p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 auth-dots pointer-events-none" />
          <div className="relative z-10">
            <div className="mb-6 flex items-center justify-center">
              <Logo size="md" />
            </div>

            {inviteLoading ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-secondary" />
                <p className="text-sm text-muted-foreground">Looking up your invitation…</p>
              </div>
            ) : invite ? (
              <div className="text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10">
                  <UserPlus className="h-7 w-7 text-secondary" />
                </div>
                <h1 className="text-2xl font-bold text-card-foreground">You're Invited!</h1>
                <p className="text-sm text-muted-foreground">
                  You've been invited to join <strong className="text-card-foreground">{invite.organization_name}</strong> as a {invite.role}.
                </p>
                <Button
                  onClick={handleAccept}
                  className="w-full bg-secondary text-secondary-foreground hover:bg-teal-light"
                  disabled={acceptLoading}
                >
                  {acceptLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Joining…</>
                  ) : (
                    "Accept Invitation & Join Team"
                  )}
                </Button>
              </div>
            ) : inviteChecked ? (
              <div className="text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="h-7 w-7 text-destructive" />
                </div>
                <h1 className="text-2xl font-bold text-card-foreground">No Invitation Found</h1>
                <p className="text-sm text-muted-foreground">
                  No pending invitation was found for <strong>{user.email}</strong>.
                </p>
                <p className="text-sm text-muted-foreground">
                  You can start a new organization instead.
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/onboarding/company">Start a New Organization</Link>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // ── Not logged in: signup form ──
  if (signupSuccess) {
    return (
      <div className="relative flex min-h-screen items-center justify-center gradient-mesh px-4 overflow-hidden animate-[auth-fade-in_500ms_ease-out_both]">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-glow-teal/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-navy-dark/40 blur-3xl rounded-full pointer-events-none" />
        <div className="auth-card w-full max-w-md rounded-3xl bg-card/80 backdrop-blur-sm ring-1 ring-white/5 p-8 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute inset-0 auth-dots pointer-events-none" />
          <div className="relative z-10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
              <Mail className="h-8 w-8 text-secondary" />
            </div>
            <h1 className="text-2xl font-bold text-card-foreground">Check Your Email</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              We sent a verification link to <strong>{email}</strong>. Click it to verify your account and accept the invitation.
            </p>
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
            <Logo size="md" />
          </div>
          <h1 className="text-center text-2xl font-bold text-card-foreground">Join Your Team</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">Create an account to accept your invitation.</p>

          {invitedEmail && (
            <Alert className="mt-4 border-secondary/30 bg-secondary/5">
              <Mail className="h-4 w-4 text-secondary" />
              <AlertDescription className="text-sm">
                Invitation sent to <strong>{invitedEmail}</strong>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSignup} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" className="auth-input" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@company.com"
                className="auth-input"
                readOnly={!!invitedEmail}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="auth-input"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-secondary text-secondary-foreground hover:bg-teal-light" disabled={signupLoading}>
              {signupLoading ? "Creating Account…" : "Create Account & Join"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to={`/login`} className="font-medium text-secondary hover:underline">Log in</Link>
            {invitedEmail && <span className="text-xs text-muted-foreground"> then return here</span>}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvite;

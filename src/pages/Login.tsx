import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      // Log the real reason for debugging, but show a generic message to
      // the user. Surfacing Supabase's "Invalid login credentials" vs
      // "Email not confirmed" lets an attacker distinguish registered
      // from unregistered emails (account enumeration).
      console.error("[login] signInWithPassword failed:", error.message);
      toast({
        variant: "destructive",
        title: "Login failed",
        description: "Invalid email or password.",
      });
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center gradient-mesh px-4 overflow-hidden animate-[auth-fade-in_500ms_ease-out_both]">
      {/* Decorative blurred circles */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-glow-teal/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-navy-dark/40 blur-3xl rounded-full pointer-events-none" />

      <div className="auth-card w-full max-w-md rounded-3xl bg-card/80 backdrop-blur-sm ring-1 ring-white/5 p-8 shadow-2xl relative overflow-hidden">
        {/* Dot pattern */}
        <div className="absolute inset-0 auth-dots pointer-events-none" />

        <div className="relative z-10">
          <div className="mb-6 flex items-center justify-center">
            <Logo size="lg" />
          </div>
          <h1 className="text-center text-2xl font-bold text-card-foreground">Welcome Back</h1>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" className="auth-input" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-secondary hover:underline">Forgot password?</Link>
              </div>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" className="auth-input" />
            </div>
            <Button type="submit" className="w-full bg-secondary text-secondary-foreground hover:bg-teal-light" disabled={loading}>
              {loading ? "Logging in…" : "Log In"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-secondary hover:underline">Start free trial</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

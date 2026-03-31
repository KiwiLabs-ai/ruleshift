import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStepRoute } from "@/hooks/use-onboarding";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (loading || !user) {
      setProfileLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_status, onboarding_step")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      if (!data) {
        const { data: createdProfile } = await supabase
          .from("profiles")
          .insert({ user_id: user.id })
          .select("onboarding_status, onboarding_step")
          .single();

        setProfile(createdProfile ?? { onboarding_status: "pending", onboarding_step: 1 });
        setProfileLoading(false);
        return;
      }

      setProfile(data);
      setProfileLoading(false);
    };
    fetchProfile();
  }, [user, loading]);

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect unverified users to /verify-email
  if (!user.email_confirmed_at && location.pathname !== "/verify-email") {
    return <Navigate to="/verify-email" replace />;
  }

  // Redirect to onboarding if not complete or profile missing
  if (!profile || profile.onboarding_status !== "complete") {
    const step = profile?.onboarding_step || 1;
    return <Navigate to={getStepRoute(step)} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

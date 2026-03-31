import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * Hook to fetch the user's profile and redirect based on onboarding status.
 * Returns the profile and loading state.
 */
export function useOnboardingGuard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setProfile(data);
      setLoading(false);
    };
    fetchProfile();
  }, [user, authLoading, navigate]);

  return { profile, loading: authLoading || loading, user };
}

const STEP_ROUTES = [
  "/onboarding/company",
  "/onboarding/sources",
  "/onboarding/notifications",
  "/onboarding/plan",
];

export function getStepRoute(step: number) {
  return STEP_ROUTES[(step - 1)] || STEP_ROUTES[0];
}

export { STEP_ROUTES };

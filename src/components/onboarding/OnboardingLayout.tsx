import { Outlet } from "react-router-dom";
import Logo from "@/components/Logo";

const OnboardingLayout = () => {
  return (
    <div className="min-h-screen bg-muted">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-2 px-4 py-4">
          <Logo size="sm" showText={false} />
        </div>
      </header>
      <main className="container mx-auto px-4 py-10">
        <Outlet />
      </main>
    </div>
  );
};

export default OnboardingLayout;

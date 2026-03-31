import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Building2, Users, Bell, CreditCard, Plug, ScrollText } from "lucide-react";
import { ProfileTab } from "@/components/settings/ProfileTab";
import { OrganizationTab } from "@/components/settings/OrganizationTab";
import { TeamTab } from "@/components/settings/TeamTab";
import { NotificationsTab } from "@/components/settings/NotificationsTab";
import { BillingTab } from "@/components/settings/BillingTab";
import { IntegrationsTab } from "@/components/settings/IntegrationsTab";
import { AuditLogTab } from "@/components/settings/AuditLogTab";

const SettingsPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account and organization</p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="profile" className="gap-1.5">
              <User className="h-4 w-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="organization" className="gap-1.5">
              <Building2 className="h-4 w-4" /> Organization
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5">
              <Users className="h-4 w-4" /> Team
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5">
              <Bell className="h-4 w-4" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-1.5">
              <CreditCard className="h-4 w-4" /> Billing
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-1.5">
              <Plug className="h-4 w-4" /> Integrations
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5">
              <ScrollText className="h-4 w-4" /> Audit Log
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="profile"><ProfileTab /></TabsContent>
            <TabsContent value="organization"><OrganizationTab /></TabsContent>
            <TabsContent value="team"><TeamTab /></TabsContent>
            <TabsContent value="notifications"><NotificationsTab /></TabsContent>
            <TabsContent value="billing"><BillingTab /></TabsContent>
            <TabsContent value="integrations"><IntegrationsTab /></TabsContent>
            <TabsContent value="audit"><AuditLogTab /></TabsContent>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;

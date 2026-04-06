import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, Webhook } from "lucide-react";

export function IntegrationsTab() {
  return (
    <div className="max-w-2xl space-y-6">
      {/* API Key */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4" /> API Access
            </CardTitle>
            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Generate API keys for programmatic access to your briefs and alerts. Available on Enterprise plans.
          </p>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Webhook className="h-4 w-4" /> Custom Webhooks
            </CardTitle>
            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configure custom webhook URLs to receive real-time alert payloads in your own systems.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

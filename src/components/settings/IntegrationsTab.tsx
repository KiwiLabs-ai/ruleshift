import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotificationPrefs } from "@/hooks/use-settings-data";
import { CheckCircle2, Circle, Key, Webhook } from "lucide-react";

export function IntegrationsTab() {
  const { data: prefs } = useNotificationPrefs();
  const slackConnected = prefs?.slack_enabled && prefs?.slack_webhook_url;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Slack */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Slack</CardTitle>
            <Badge
              variant="outline"
              className={slackConnected ? "text-green-700 border-green-300 gap-1" : "text-muted-foreground gap-1"}
            >
              {slackConnected ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
              {slackConnected ? "Connected" : "Not Connected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {slackConnected
              ? "Slack alerts are active. Configure your webhook URL in the Notifications tab."
              : "Enable Slack in the Notifications tab to receive alerts in your Slack workspace."}
          </p>
        </CardContent>
      </Card>

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

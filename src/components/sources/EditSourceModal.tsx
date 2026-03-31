import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface EditSourceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: any;
  onSave: (updates: { id: string; custom_name?: string; custom_url?: string; custom_selector?: string; check_frequency?: string }) => Promise<void>;
  isSaving: boolean;
}

export function EditSourceModal({ open, onOpenChange, source, onSave, isSaving }: EditSourceModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selector, setSelector] = useState("");
  const [freq, setFreq] = useState("6h");

  useEffect(() => {
    if (source) {
      setName(source.custom_name || source.policy_sources?.name || "");
      setUrl(source.custom_url || source.policy_sources?.url || "");
      setSelector(source.custom_selector || "");
      setFreq(source.check_frequency || "6h");
    }
  }, [source]);

  const handleSave = async () => {
    try {
      await onSave({
        id: source.id,
        custom_name: name || undefined,
        custom_url: source.is_custom ? url : undefined,
        custom_selector: selector || undefined,
        check_frequency: freq,
      });
      toast({ title: "Source updated" });
      onOpenChange(false);
    } catch {
      toast({ title: "Error", description: "Failed to update source.", variant: "destructive" });
    }
  };

  if (!source) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Source</DialogTitle>
          <DialogDescription>Update monitoring settings for this source.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {source.is_custom && (
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
          )}

          <div className="space-y-2">
            <Label>CSS Selector (optional)</Label>
            <Input
              placeholder="e.g. #terms-content"
              value={selector}
              onChange={(e) => setSelector(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Check Frequency</Label>
            <Select value={freq} onValueChange={setFreq}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6h">Every 6 hours</SelectItem>
                <SelectItem value="12h">Every 12 hours</SelectItem>
                <SelectItem value="24h">Every 24 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full" onClick={handleSave} disabled={isSaving}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

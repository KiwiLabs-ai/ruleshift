import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganizationData, useUpdateOrganization } from "@/hooks/use-settings-data";
import { useToast } from "@/hooks/use-toast";

const industries = [
  "Technology / SaaS", "Finance / Banking", "Healthcare", "E-commerce / Retail",
  "Education", "Legal", "Media / Advertising", "Government", "Other",
];
const sizes = ["1-10", "11-50", "51-200", "201-500", "500+"];

export function OrganizationTab() {
  const { data: org, isLoading } = useOrganizationData();
  const updateOrg = useUpdateOrganization();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [concern, setConcern] = useState("");

  useEffect(() => {
    if (org) {
      setName(org.name ?? "");
      setIndustry(org.industry ?? "");
      setCompanySize(org.company_size ?? "");
      setConcern(org.compliance_concern ?? "");
    }
  }, [org]);

  const handleSave = async () => {
    try {
      await updateOrg.mutateAsync({
        name,
        industry,
        company_size: companySize,
        compliance_concern: concern || undefined,
      });
      toast({ title: "Organization updated" });
    } catch {
      toast({ title: "Error saving organization", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div className="space-y-2">
        <Label>Company Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Industry</Label>
        <Select value={industry} onValueChange={setIndustry}>
          <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
          <SelectContent>
            {industries.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Company Size</Label>
        <Select value={companySize} onValueChange={setCompanySize}>
          <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
          <SelectContent>
            {sizes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Primary Compliance Concern</Label>
        <Textarea
          value={concern}
          onChange={(e) => setConcern(e.target.value)}
          placeholder="Describe your main compliance challenges…"
          rows={3}
        />
      </div>
      <Button onClick={handleSave} disabled={updateOrg.isPending}>
        {updateOrg.isPending ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  );
}

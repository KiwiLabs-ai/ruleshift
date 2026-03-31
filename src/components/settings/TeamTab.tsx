import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UserPlus, MoreHorizontal, ArrowUpCircle, Loader2 } from "lucide-react";
import { useTeamMembers, useInviteMember, useRemoveMember, useUpdateRole, TeamMember } from "@/hooks/use-team-data";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const roleBadgeClasses: Record<string, string> = {
  owner: "bg-primary/15 text-primary border-primary/30",
  admin: "bg-accent/15 text-accent-foreground border-accent/30",
  member: "bg-muted text-muted-foreground border-border",
};

export function TeamTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data, isLoading } = useTeamMembers();
  const inviteMember = useInviteMember();
  const removeMember = useRemoveMember();
  const updateRole = useUpdateRole();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);

  const members = data?.members ?? [];
  const memberLimit = data?.memberLimit ?? 1;
  const memberCount = members.length;
  const atLimit = memberCount >= memberLimit;

  // Find caller's membership to determine permissions
  const callerMembership = members.find((m) => m.user_id === user?.id);
  const callerRole = callerMembership?.role ?? "member";
  const isOwner = callerRole === "owner";
  const isAdminOrOwner = callerRole === "owner" || callerRole === "admin";

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await inviteMember.mutateAsync({ email: inviteEmail.trim(), role: inviteRole });
      toast({ title: "Invitation sent", description: `Invited ${inviteEmail.trim()}` });
      setInviteEmail("");
      setInviteRole("member");
      setInviteOpen(false);
    } catch (err: any) {
      toast({ title: "Failed to invite", description: err.message, variant: "destructive" });
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    try {
      await removeMember.mutateAsync(removeTarget.id);
      toast({ title: "Member removed" });
      setRemoveTarget(null);
    } catch (err: any) {
      toast({ title: "Failed to remove", description: err.message, variant: "destructive" });
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await updateRole.mutateAsync({ member_id: memberId, role: newRole });
      toast({ title: "Role updated" });
    } catch (err: any) {
      toast({ title: "Failed to update role", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Team Members</CardTitle>
            <CardDescription>
              {memberCount} of {memberLimit >= 9999 ? "∞" : memberLimit} seat{memberLimit !== 1 ? "s" : ""} used
            </CardDescription>
          </div>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button disabled={!isAdminOrOwner || atLimit} size="sm" className="gap-1.5">
                <UserPlus className="h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a team member</DialogTitle>
                <DialogDescription>
                  They'll receive an invitation to join your organization.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Email address</Label>
                  <Input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      {isOwner && <SelectItem value="admin">Admin</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleInvite} disabled={inviteMember.isPending || !inviteEmail.trim()}>
                  {inviteMember.isPending ? "Sending…" : "Send Invite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        {atLimit && isAdminOrOwner && (
          <CardContent className="pt-0 pb-4">
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              <ArrowUpCircle className="h-4 w-4 shrink-0" />
              Upgrade your plan to add more team members.
            </div>
          </CardContent>
        )}
      </Card>

      {/* Members table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                {isAdminOrOwner && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const isPending = !m.accepted_at;
                const isSelf = m.user_id === user?.id;
                const displayName = m.full_name || m.invited_email || "—";
                const displayEmail = m.invited_email || "—";

                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{displayName}</TableCell>
                    <TableCell className="text-muted-foreground">{displayEmail}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleBadgeClasses[m.role] ?? ""}>
                        {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-sm">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            isPending ? "bg-yellow-500" : "bg-green-500"
                          }`}
                        />
                        {isPending ? "Pending" : "Active"}
                      </span>
                    </TableCell>
                    {isAdminOrOwner && (
                      <TableCell>
                        {!isSelf && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {isOwner && m.role !== "owner" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleRoleChange(m.id, m.role === "admin" ? "member" : "admin")
                                    }
                                  >
                                    {m.role === "admin" ? "Demote to Member" : "Promote to Admin"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setRemoveTarget(m)}
                              >
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdminOrOwner ? 5 : 4} className="text-center text-muted-foreground py-8">
                    No team members yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Remove confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget?.full_name || removeTarget?.invited_email} will lose access to this organization. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={removeMember.isPending}>
              {removeMember.isPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

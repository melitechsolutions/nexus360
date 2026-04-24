import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { User, Loader2, AlertCircle, X, CheckCircle2 } from "lucide-react";

interface AccountManagerSelectorProps {
  clientId: string;
  onSuccess?: () => void;
}

export function AccountManagerSelector({ clientId, onSuccess }: AccountManagerSelectorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  const { data: accountManager, isLoading: accountManagerLoading, refetch: refetchAccountManager } = trpc.clients.getAccountManager.useQuery(clientId);
  const { data: users = [], isLoading: usersLoading } = trpc.users.listForAssignment.useQuery();

  const assignMutation = trpc.clients.assignAccountManager.useMutation({
    onSuccess: () => {
      toast.success("Account manager assigned successfully");
      setIsEditing(false);
      setSelectedUserId("");
      refetchAccountManager();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to assign account manager");
    },
  });

  const removeMutation = trpc.clients.removeAccountManager.useMutation({
    onSuccess: () => {
      toast.success("Account manager removed successfully");
      setIsEditing(false);
      setSelectedUserId("");
      refetchAccountManager();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove account manager");
    },
  });

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId) {
      toast.error("Please select an account manager");
      return;
    }

    assignMutation.mutate({
      clientId,
      userId: selectedUserId,
    });
  };

  const handleRemove = () => {
    if (confirm("Are you sure you want to remove the account manager?")) {
      removeMutation.mutate(clientId);
    }
  };

  // Suggest sales managers and customer success managers first
  const suggestedUsers = useMemo(() => {
    const suggested = users.filter(
      (u: any) => u.role === 'sales_manager' || u.role === 'customer_success_manager'
    );
    return suggested;
  }, [users]);

  const otherUsers = useMemo(() => {
    const suggestedIds = new Set(suggestedUsers.map((u: any) => u.id));
    return users.filter((u: any) => !suggestedIds.has(u.id));
  }, [users, suggestedUsers]);

  if (accountManagerLoading || usersLoading) {
    return (
      <div className="flex justify-center items-center h-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Account Manager
        </CardTitle>
        <CardDescription>
          Assign a team member to manage this client's account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {accountManager && !isEditing ? (
          /* Current Account Manager Display */
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-green-50 border-green-200">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-900">
                      {accountManager.employeeName || accountManager.name}
                    </span>
                  </div>
                  <div className="text-sm text-green-800 ml-7">
                    {accountManager.email && <div>{accountManager.email}</div>}
                    {accountManager.role && <div className="capitalize">{accountManager.role.replace('_', ' ')}</div>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(true);
                      setSelectedUserId(accountManager.id);
                    }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Change
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemove}
                    disabled={removeMutation.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : isEditing ? (
          /* Edit Form */
          <form onSubmit={handleAssign} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Account Manager</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an account manager" />
                </SelectTrigger>
                <SelectContent>
                  {suggestedUsers.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50">
                        SUGGESTED FOR THIS ROLE
                      </div>
                      {suggestedUsers.map((user: any) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                            {user.name} ({user.role.replace('_', ' ')})
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}

                  {otherUsers.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50">
                        OTHER TEAM MEMBERS
                      </div>
                      {otherUsers.map((user: any) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.role.replace('_', ' ')})
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setSelectedUserId("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={assignMutation.isPending || !selectedUserId}
              >
                {assignMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {accountManager ? 'Update' : 'Assign'}
              </Button>
            </div>
          </form>
        ) : (
          /* No Account Manager Assigned */
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No account manager assigned yet.
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => setIsEditing(true)}
              className="w-full"
            >
              <User className="h-4 w-4 mr-2" />
              Assign Account Manager
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

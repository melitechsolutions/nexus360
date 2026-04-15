import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText } from "lucide-react";
import { useLocation } from "wouter";

export default function CreateImprest() {
  const [, setLocation] = useLocation();
  const [userId, setUserId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [amount, setAmount] = useState<number>(0);

  const createMutation = trpc.imprest.create.useMutation({
    onSuccess: () => {
      toast.success("Done");
      setLocation("/imprests");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { toast.error("Employee ID is required"); return; }
    if (amount <= 0) { toast.error("Amount must be greater than 0"); return; }
    createMutation.mutate({ userId, purpose: purpose || undefined, amount });
  };

  return (
    <ModuleLayout
      title="Request Imprest Advance"
      icon={<FileText className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Finance" },
        { label: "Create Imprest" },
      ]}
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Imprest Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Employee / User ID *</label>
              <Input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="User ID (UUID)"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Purpose</label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Describe purpose of the imprest"
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Amount (KES) *</label>
              <Input
                type="number"
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => setLocation("/imprests")}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Submitting…" : "Submit Request"}
          </Button>
        </div>
      </form>
    </ModuleLayout>
  );
}

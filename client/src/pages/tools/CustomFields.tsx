import { Settings, Loader2 } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CustomFields() {
  const settingsQuery = trpc.settings.getByCategory.useQuery({ category: "custom_fields" });

  const items = (settingsQuery.data as any[]) ?? ((settingsQuery.data as any)?.settings ?? []);

  return (
    <ModuleLayout
      title="Custom Fields"
      icon={<Settings className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Tools" },
        { label: "Custom Fields" },
      ]}
    >
      {settingsQuery.isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {settingsQuery.error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Error: {settingsQuery.error.message}</div>
      )}

      {!settingsQuery.isLoading && !settingsQuery.error && items.length === 0 && (
        <p className="text-center text-gray-500 py-8">No data found.</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Configured Fields ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((field: any, idx: number) => (
                  <TableRow key={field.id ?? idx}>
                    <TableCell className="font-medium">{field.name ?? field.key ?? "—"}</TableCell>
                    <TableCell>{field.type ?? field.fieldType ?? "—"}</TableCell>
                    <TableCell>{field.entity ?? field.module ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={field.required ? "default" : "secondary"}>
                        {field.required ? "Required" : "Optional"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={field.active !== false ? "bg-green-100 text-green-800 border-0" : "bg-gray-100 text-gray-600 border-0"}>
                        {field.active !== false ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </ModuleLayout>
  );
}

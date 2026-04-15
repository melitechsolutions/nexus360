import React from "react";
import { Users, Circle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function Presence() {
  const { data, isLoading, error } = trpc.realtimeCollaboration.getTeamActivityStream.useQuery({});

  const activities: any[] = (data as any)?.activities ?? (data as any)?.stream ?? (data as any) ?? [];

  return (
    <ModuleLayout
      title="Team Presence"
      icon={<Users className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Communication" },
        { label: "Presence" },
      ]}
    >
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error.message}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Activity Items</div>
              <div className="text-3xl font-bold text-green-600">{activities.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Status</div>
              <div className="text-3xl font-bold text-green-600">✓ Live</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Live Activity Stream</h2>
            {activities.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No activity data available</p>
            ) : (
              <div className="space-y-3">
                {activities.map((activity: any, i: number) => (
                  <div key={activity.id ?? i} className="flex items-center gap-3 p-3 border rounded">
                    <Circle
                      className={`w-2 h-2 ${
                        i === 0 ? "fill-green-500 text-green-500" : "fill-gray-300 text-gray-300"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="text-sm">
                        <span className="font-semibold">{activity.user ?? activity.userName ?? "\u2014"}</span>{" "}
                        <span className="text-gray-600">{activity.action ?? activity.type ?? ""}</span>{" "}
                        <span className="font-medium">{activity.item ?? activity.target ?? activity.details ?? ""}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">{activity.time ?? activity.timestamp ?? activity.createdAt ?? ""}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </ModuleLayout>
  );
}

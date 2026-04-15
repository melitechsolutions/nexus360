/**
 * Collaboration Hub Page
 * Team chat, presence tracking, activity feed — wired to realtimeCollaboration backend
 */

import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  MessageSquare,
  Send,
  Activity,
  Circle,
} from "lucide-react";

export default function CollaborationHub() {
  const [chatMessage, setChatMessage] = useState("");
  const [chatChannel] = useState("general");

  const utils = trpc.useUtils();

  // Notifications / messages
  const { data: notificationsRaw } = trpc.realtimeCollaboration.streamLiveNotifications.useQuery(
    { userId: "current" },
    { refetchInterval: 10000 }
  );
  const notifications = notificationsRaw?.recentNotifications || [];

  // Team activity stream
  const { data: activityRaw } = trpc.realtimeCollaboration.getTeamActivityStream.useQuery(
    { teamId: "default", limit: 30 }
  );
  const activities = activityRaw?.activities || [];

  // Presence
  const { data: presenceRaw } = trpc.realtimeCollaboration.initializePresenceTracking.useQuery(
    { documentId: "hub", userId: "current" },
    { refetchInterval: 15000 }
  );
  const activeUsers = presenceRaw?.activeUsers || [];

  // Send chat message
  const sendMutation = trpc.realtimeCollaboration.sendChatMessage.useMutation({
    onSuccess: () => {
      setChatMessage("");
      utils.realtimeCollaboration.streamLiveNotifications.invalidate();
      toast.success("Message sent");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSendMessage = () => {
    const msg = chatMessage.trim();
    if (!msg) return;
    sendMutation.mutate({ channelId: chatChannel, message: msg });
  };

  const onlineCount = activeUsers.filter((u: any) => u.lastSeen && new Date(u.lastSeen).getTime() > Date.now() - 300000).length;

  return (
    <ModuleLayout
      title="Collaboration Hub"
      description="Team chat, presence and activity feed"
      icon={<Users className="h-6 w-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Collaboration" },
      ]}
    >
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-green-600">{onlineCount}</p>
              <p className="text-sm text-muted-foreground">Online Now</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{activeUsers.length}</p>
              <p className="text-sm text-muted-foreground">Team Members</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-purple-600">{notifications.length}</p>
              <p className="text-sm text-muted-foreground">Notifications</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-orange-600">{activities.length}</p>
              <p className="text-sm text-muted-foreground">Recent Activities</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="chat">
          <TabsList>
            <TabsTrigger value="chat">
              <MessageSquare className="h-4 w-4 mr-1" /> Chat
            </TabsTrigger>
            <TabsTrigger value="team">
              <Users className="h-4 w-4 mr-1" /> Team ({activeUsers.length})
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="h-4 w-4 mr-1" /> Activity
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">#{chatChannel}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Messages */}
                <div className="border rounded-md p-4 min-h-[300px] max-h-[400px] overflow-y-auto space-y-3 bg-muted/30">
                  {notifications.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    notifications.map((n: any) => (
                      <div key={n.id} className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {(n.user || "?").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{n.user || "System"}</span>
                            <span className="text-xs text-muted-foreground">
                              {n.timestamp ? new Date(n.timestamp).toLocaleTimeString() : ""}
                            </span>
                            {!n.read && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">New</Badge>
                            )}
                          </div>
                          <p className="text-sm mt-0.5">{n.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button onClick={handleSendMessage} disabled={sendMutation.isPending || !chatMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Presence Tab */}
          <TabsContent value="team" className="mt-4">
            {activeUsers.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No team presence data available yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeUsers.map((user: any, idx: number) => {
                  const isRecent = user.lastSeen && new Date(user.lastSeen).getTime() > Date.now() - 300000;
                  return (
                    <Card key={user.id || idx}>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                              style={{ backgroundColor: user.color || "#6366f1" }}
                            >
                              {(user.name || "?").slice(0, 2).toUpperCase()}
                            </div>
                            <Circle
                              className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 ${
                                isRecent ? "fill-green-500 text-green-500" : "fill-gray-400 text-gray-400"
                              }`}
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">{user.name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">
                              {isRecent ? "Online" : user.lastSeen ? `Last seen ${new Date(user.lastSeen).toLocaleString()}` : "Offline"}
                            </p>
                          </div>
                          {isRecent && (
                            <Badge className="bg-green-100 text-green-700">Online</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-4">
            {activities.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent activity.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {activities.map((act: any) => (
                  <Card key={act.id}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                          {(act.user || "?").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-semibold">{act.user || "System"}</span>
                            {" "}{act.action || act.type || "performed an action"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {act.timestamp ? new Date(act.timestamp).toLocaleString() : ""}
                          </p>
                        </div>
                        {act.type && (
                          <Badge variant="outline">{act.type}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ModuleLayout>
  );
}

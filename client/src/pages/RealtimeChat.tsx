import React, { useState } from "react";
import { MessageSquare, Send, Paperclip, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function RealtimeChat() {
  const [channelId] = useState("general");
  const [newMessage, setNewMessage] = useState("");

  const { data: msgData, isLoading, error } = trpc.staffChat.getMessages.useQuery({ channelId });
  const { data: memberData } = trpc.staffChat.getMembers.useQuery();
  const utils = trpc.useUtils();

  const sendMessage = trpc.staffChat.sendMessage.useMutation({
    onSuccess: () => {
      setNewMessage("");
      utils.staffChat.getMessages.invalidate();
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to send message"),
  });

  const messages: any[] = (msgData as any)?.messages ?? (msgData as any) ?? [];
  const members: any[] = (memberData as any)?.members ?? (memberData as any) ?? [];

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessage.mutate({ content: newMessage, channelId });
  };

  return (
    <ModuleLayout
      title="Team Chat"
      icon={<MessageSquare className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Communication" },
        { label: "Chat" },
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
          <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col max-h-96">
            <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <h2 className="font-semibold">#{channelId}</h2>
              <p className="text-xs text-blue-100">{members.length} members</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No messages yet</p>
              ) : (
                messages.map((msg: any) => (
                  <div key={msg.id} className="flex gap-3">
                    <span className="text-2xl flex-shrink-0">{msg.avatar ?? "\uD83D\uDCAC"}</span>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-sm">{msg.user ?? msg.senderName ?? msg.userName ?? "\u2014"}</span>
                        <span className="text-xs text-gray-500">{msg.timestamp ?? msg.createdAt ?? ""}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{msg.message ?? msg.content ?? ""}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded">
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sendMessage.isPending || !newMessage.trim()}
                  className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {members.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-3">Team Members</h3>
              <div className="space-y-2">
                {members.map((member: any) => (
                  <div key={member.id ?? member.name} className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        member.status === "online"
                          ? "bg-green-500"
                          : member.status === "away"
                          ? "bg-yellow-500"
                          : "bg-gray-300"
                      }`}
                    ></span>
                    <span className="text-sm">{member.name ?? "\u2014"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </ModuleLayout>
  );
}

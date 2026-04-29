import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Send,
  Smile,
  Trash2,
  Reply,
  X,
  Users,
  MessageCircle,
} from "lucide-react";

// Common emoji options
const EMOJI_OPTIONS = [
  "👍", "❤️", "😂", "😮", "😢", "😡", "🎉", "🔥",
  "✨", "👏", "💯", "🚀", "💡", "📝", "⏰", "✅",
  "❌", "👀", "🤔", "😴", "🤷", "😎", "🙌", "💪",
];

interface StaffMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  emoji?: string;
  replyToId?: string;
  replyToUser?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function StaffChat() {
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string>();
  const [replyTo, setReplyTo] = useState<StaffMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [members, setMembers] = useState<Array<{ userId: string; userName: string; lastSeen: Date }>>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "members">("chat");

  const utils = trpc.useUtils();

  // Queries and mutations
  const { data: messagesData, refetch: refetchMessages } = trpc.staffChat.getMessages.useQuery({
    limit: 50,
    offset: 0,
  });

  const { data: membersData, refetch: refetchMembers } = trpc.staffChat.getMembers.useQuery({});

  const sendMessageMutation = trpc.staffChat.sendMessage.useMutation({
    onSuccess: () => {
      setInput("");
      setSelectedEmoji(undefined);
      setReplyTo(null);
      refetchMessages();
      refetchMembers();
      toast.success("Message sent!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send message");
    },
  });

  const deleteMessageMutation = trpc.staffChat.deleteMessage.useMutation({
    onSuccess: () => {
      refetchMessages();
      toast.success("Message deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete message");
    },
  });

  const searchMessagesMutation = trpc.staffChat.searchMessages.useMutation();

  // Update state from query data
  useEffect(() => {
    if (messagesData?.messages) {
      setMessages(messagesData.messages.map(m => ({
        ...m,
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt),
      })));
    }
  }, [messagesData]);

  useEffect(() => {
    if (membersData) {
      setMembers(membersData.map(m => ({
        ...m,
        lastSeen: new Date(m.lastSeen),
      })));
    }
  }, [membersData]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages
  useEffect(() => {
    const interval = setInterval(() => {
      refetchMessages();
      refetchMembers();
    }, 3000);

    return () => clearInterval(interval);
  }, [refetchMessages, refetchMembers]);

  const handleSendMessage = async () => {
    if (!input.trim()) {
      toast.error("Please enter a message");
      return;
    }

    sendMessageMutation.mutate({
      content: input,
      emoji: selectedEmoji,
      replyToId: replyTo?.id,
    });
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query) {
      const results = await searchMessagesMutation.mutateAsync({ query });
      setMessages(results.map(m => ({
        ...m,
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt),
      })));
    } else {
      refetchMessages();
    }
  };

  const quotedMessage = replyTo ? messages.find(m => m.id === replyTo.id) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-screen">
      {/* Members Sidebar */}
      <Card className="md:col-span-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-4 h-4" />
            Staff Members
          </CardTitle>
          <CardDescription>{members.length} online</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-2">
          {members.length === 0 ? (
            <p className="text-sm text-gray-500">No members online</p>
          ) : (
            members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
              >
                <span className="text-sm">{member.userName}</span>
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Chat Section */}
      <Card className="md:col-span-3 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <CardTitle>Team Chat</CardTitle>
            </div>
          </div>
          <CardDescription>Real-time team communication</CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Search */}
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full text-sm"
          />

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className="group p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  {/* Reply Reference */}
                  {message.replyToId && message.replyToUser && (
                    <div className="text-xs text-gray-600 mb-1 flex items-center gap-1 pl-2 border-l-2 border-blue-300">
                      <Reply className="w-3 h-3" />
                      Replying to {message.replyToUser}
                    </div>
                  )}

                  {/* Message Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {message.userName}
                      </p>
                      <p className="text-xs text-gray-600">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    {message.emoji && (
                      <span className="text-lg">{message.emoji}</span>
                    )}
                  </div>

                  {/* Message Content */}
                  <p className="text-sm text-gray-800 mt-1 break-words">
                    {message.content}
                  </p>

                  {/* Message Actions */}
                  <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs gap-1"
                      onClick={() => setReplyTo(message)}
                    >
                      <Reply className="w-3 h-3" />
                      Reply
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs gap-1"
                      onClick={() => deleteMessageMutation.mutate({ id: message.id })}
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Reference */}
          {replyTo && (
            <div className="p-2 bg-blue-50 border-l-4 border-blue-400 rounded flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-blue-900">
                  Replying to {replyTo.userName}
                </p>
                <p className="text-xs text-blue-800 truncate">
                  {replyTo.content}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0"
                onClick={() => setReplyTo(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Input Area */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !sendMessageMutation.isPending &&
                  handleSendMessage()
                }
                disabled={sendMessageMutation.isPending}
                className="flex-1"
              />

              {/* Emoji Picker Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="relative"
              >
                <Smile className="w-4 h-4" />
                {selectedEmoji && (
                  <span className="absolute -top-2 -right-2 text-lg">
                    {selectedEmoji}
                  </span>
                )}
              </Button>

              {/* Send Button */}
              <Button
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending || !input.trim()}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1 p-2 bg-gray-100 rounded">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setSelectedEmoji(emoji);
                      setShowEmojiPicker(false);
                    }}
                    className={`text-xl p-1 rounded hover:bg-gray-200 ${
                      selectedEmoji === emoji ? "bg-blue-200" : ""
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Selected Emoji Display */}
            {selectedEmoji && (
              <div className="flex items-center justify-between p-2 bg-gray-100 rounded">
                <span className="text-sm">
                  Selected emoji: <span className="text-lg">{selectedEmoji}</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEmoji(undefined)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default StaffChat;

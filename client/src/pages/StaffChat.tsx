import { useState, useEffect, useRef, useMemo } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  MessageCircle, Send, Users, Smile, Trash2, Reply, X, Pencil, Search,
  Plus, Hash, Lock, Paperclip, FileText, Image as ImageIcon, Download, UserPlus, Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EMOJI_OPTIONS = [
  "👍", "❤️", "😂", "😮", "😢", "😡", "🎉", "🔥",
  "✨", "👏", "💯", "🚀", "💡", "📝", "⏰", "✅",
  "❌", "👀", "🤔", "😴", "🤷", "😎", "🙌", "💪",
  "🌟", "🍕", "☕", "📅", "📌", "🔒", "🔑", "🎁",
  "📎", "💼", "📊", "📈", "📉", "💬", "👤", "👥",
  "🗂️", "📂", "🖼️", "🎨", "🎬", "🎤", "🎧", "🎮",
  "⚽", "🏀", "🏆", "🚗", "✈️", "🏠", "🏢", "🏥",
  "😅", "😇", "🤩", "🥳", "😜", "🤪", "🤨", "🧐",
  "😬", "😰", "😱", "😭", "😤", "😠", "🤬", "👻",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(userId: string) {
  const colors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
    "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-rose-500",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getChannelIcon(type: string) {
  if (type === "private") return <Lock className="w-3.5 h-3.5" />;
  if (type === "team") return <Hash className="w-3.5 h-3.5" />;
  return <MessageCircle className="w-3.5 h-3.5" />;
}

export default function StaffChat() {
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);
  const [editingMsg, setEditingMsg] = useState<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [activeChannelId, setActiveChannelId] = useState("general");
  const [showNewChannelDialog, setShowNewChannelDialog] = useState(false);
  const [showNewPrivateDialog, setShowNewPrivateDialog] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [newChannelMembers, setNewChannelMembers] = useState<string[]>([]);
  const [privateRecipient, setPrivateRecipient] = useState("");
  const [pendingFile, setPendingFile] = useState<{ name: string; url: string; type: string } | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current user info
  const { data: profileData } = trpc.auth.me.useQuery();
  const currentUserId = profileData?.id || "";
  const currentUserName = profileData?.name || profileData?.email || "Me";

  // Channels
  const { data: channelsData, refetch: refetchChannels } = trpc.staffChat.listChannels.useQuery(
    undefined,
    { refetchInterval: 10000 }
  );
  const channels = channelsData || [];
  const activeChannel = channels.find((c: any) => c.id === activeChannelId) || channels[0];

  // Messages for active channel
  const { data: messagesData, refetch: refetchMessages } = trpc.staffChat.getMessages.useQuery(
    { channelId: activeChannelId, limit: 100, offset: 0 },
    { refetchInterval: 3000 }
  );

  const { data: membersData } = trpc.staffChat.getMembers.useQuery(
    undefined,
    { refetchInterval: 5000 }
  );

  // Mutations
  const sendMut = trpc.staffChat.sendMessage.useMutation({
    onSuccess: () => {
      setInput("");
      setReplyTo(null);
      setShowEmojiPicker(false);
      setPendingFile(null);
      refetchMessages();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const editMut = trpc.staffChat.editMessage.useMutation({
    onSuccess: () => {
      setInput("");
      setEditingMsg(null);
      refetchMessages();
      toast.success("Message updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = trpc.staffChat.deleteMessage.useMutation({
    onSuccess: () => {
      refetchMessages();
      toast.success("Message deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createChannelMut = trpc.staffChat.createChannel.useMutation({
    onSuccess: (data: any) => {
      setShowNewChannelDialog(false);
      setShowNewPrivateDialog(false);
      setNewChannelName("");
      setNewChannelDesc("");
      setNewChannelMembers([]);
      setPrivateRecipient("");
      refetchChannels();
      if (data?.id) setActiveChannelId(data.id);
      toast.success("Channel created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const messages = messagesData?.messages || [];
  const members = membersData || [];

  // Search
  const { data: searchResults } = trpc.staffChat.searchMessages.useQuery(
    { query: searchQuery, channelId: activeChannelId },
    { enabled: showSearch && searchQuery.length > 0 }
  );

  const displayMessages = showSearch && searchQuery.length > 0 && searchResults
    ? JSON.parse(JSON.stringify(searchResults))
    : messages;

  // @mention filtering
  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    return members.filter((m: any) =>
      m.userName.toLowerCase().includes(mentionQuery.toLowerCase())
    ).slice(0, 6);
  }, [mentionQuery, members]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim() && !pendingFile) return;

    if (editingMsg) {
      editMut.mutate({ id: editingMsg.id, content: input });
      return;
    }

    sendMut.mutate({
      content: input.trim() || (pendingFile ? `📎 ${pendingFile.name}` : ""),
      channelId: activeChannelId,
      replyToId: replyTo?.id,
      fileUrl: pendingFile?.url,
      fileName: pendingFile?.name,
      fileType: pendingFile?.type,
    });
  };

  const handleEmojiInsert = (emoji: string) => {
    setInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const startEdit = (msg: any) => {
    setEditingMsg(msg);
    setInput(msg.content);
    setReplyTo(null);
  };

  const cancelEdit = () => {
    setEditingMsg(null);
    setInput("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPendingFile({
        name: file.name,
        url: reader.result as string,
        type: file.type.startsWith("image/") ? "image" : "file",
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCreateTeamChannel = () => {
    if (!newChannelName.trim()) { toast.error("Channel name required"); return; }
    createChannelMut.mutate({
      name: newChannelName.trim(),
      type: "team",
      description: newChannelDesc.trim() || undefined,
      members: newChannelMembers,
    });
  };

  const handleCreatePrivateChat = () => {
    if (!privateRecipient) { toast.error("Select a user"); return; }
    const recipient = members.find((m: any) => m.userId === privateRecipient);
    const name = `${currentUserName} & ${recipient?.userName || "User"}`;
    createChannelMut.mutate({
      name,
      type: "private",
      members: [privateRecipient],
    });
  };

  const getPrivateChatName = (channel: any) => {
    if (channel.type !== "private") return channel.name;
    const memberIds = (channel.members as string[]) || [];
    const otherId = memberIds.find((id: string) => id !== currentUserId);
    if (otherId) {
      const other = members.find((m: any) => m.userId === otherId);
      return other?.userName || "Private Chat";
    }
    return channel.name;
  };

  // Group channels by type
  const generalChannels = channels.filter((c: any) => c.type === "general");
  const teamChannels = channels.filter((c: any) => c.type === "team");
  const privateChannels = channels.filter((c: any) => c.type === "private");

  // Helper to render sidebar content
  const renderSidebatContent = () => (
    <>
      <CardHeader className="pb-2 space-y-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" /> Channels
          </span>
          {mobileSidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => setShowNewChannelDialog(true)}>
            <Plus className="w-3 h-3 mr-1" /> Team
          </Button>
          <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => setShowNewPrivateDialog(true)}>
            <UserPlus className="w-3 h-3 mr-1" /> Private
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* General */}
        {generalChannels.map((ch: any) => (
          <button
            key={ch.id}
            onClick={() => {
              setActiveChannelId(ch.id);
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition ${
              activeChannelId === ch.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            {getChannelIcon(ch.type)}
            <span className="truncate font-medium">{ch.name}</span>
          </button>
        ))}

        {/* Team Channels */}
        {teamChannels.length > 0 && (
          <>
            <div className="px-2 pt-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Team Channels</p>
            </div>
            {teamChannels.map((ch: any) => (
              <button
                key={ch.id}
                onClick={() => {
                  setActiveChannelId(ch.id);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition ${
                  activeChannelId === ch.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {getChannelIcon(ch.type)}
                <span className="truncate">{ch.name}</span>
              </button>
            ))}
          </>
        )}

        {/* Private Messages */}
        {privateChannels.length > 0 && (
          <>
            <div className="px-2 pt-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Direct Messages</p>
            </div>
            {privateChannels.map((ch: any) => (
              <button
                key={ch.id}
                onClick={() => {
                  setActiveChannelId(ch.id);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition ${
                  activeChannelId === ch.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {getChannelIcon(ch.type)}
                <span className="truncate">{getPrivateChatName(ch)}</span>
              </button>
            ))}
          </>
        )}

        {/* Online Members */}
        <Separator className="my-2" />
        <div className="px-2 pt-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Users className="w-3 h-3" /> Online ({members.length})
          </p>
        </div>
        {members.map((m: any) => (
          <div key={m.userId} className="flex items-center gap-2 px-3 py-1.5">
            <div className="relative">
              <Avatar className="w-6 h-6">
                <AvatarFallback className={`${getAvatarColor(m.userId)} text-white text-[9px]`}>
                  {getInitials(m.userName)}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border border-white rounded-full" />
            </div>
            <span className="text-xs truncate">{m.userName}</span>
          </div>
        ))}
      </CardContent>
    </>
  );

  return (
    <ModuleLayout
      title="Team Chat"
      description="Real-time team communication"
      icon={<MessageCircle className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Communications" },
        { label: "Team Chat" },
      ]}
    >
      <div className="flex gap-3 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Desktop Sidebar */}
        <Card className="hidden md:flex md:w-64 md:flex-shrink-0 md:flex-col">
          {renderSidebatContent()}
        </Card>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <Card
              className="fixed left-0 top-0 h-full w-64 flex-shrink-0 flex flex-col rounded-none"
              onClick={(e) => e.stopPropagation()}
            >
              {renderSidebatContent()}
            </Card>
          </div>
        )}

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="border-b pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Mobile menu button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0 md:hidden flex-shrink-0"
                  onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <div className="min-w-0 flex-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {activeChannel && getChannelIcon(activeChannel.type)}
                    {activeChannel ? (activeChannel.type === "private" ? getPrivateChatName(activeChannel) : activeChannel.name) : "General Chat"}
                  </CardTitle>
                  <CardDescription>
                    {activeChannel?.description || `${messages.length} messages`}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {showSearch ? (
                  <div className="flex items-center gap-1">
                    <Input
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 w-40 text-sm"
                      autoFocus
                    />
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowSearch(true)} title="Search messages">
                    <Search className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-1">
            {displayMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              </div>
            ) : (
              displayMessages.map((msg: any) => {
                const isOwn = msg.userId === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}
                  >
                    <div className={`flex gap-2 max-w-[75%] ${isOwn ? "flex-row-reverse" : ""}`}>
                      <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                        <AvatarFallback className={`${getAvatarColor(msg.userId)} text-white text-[10px]`}>
                          {getInitials(msg.userName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="group">
                        {msg.replyToId && msg.replyToUser && (
                          <div className={`text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1 ${isOwn ? "justify-end" : ""}`}>
                            <Reply className="w-3 h-3" />
                            Replying to {msg.replyToUser}
                          </div>
                        )}

                        <div
                          className={`px-3 py-2 rounded-2xl ${
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted rounded-bl-md"
                          }`}
                        >
                          {!isOwn && (
                            <p className="text-xs font-semibold mb-0.5 opacity-80">
                              {msg.userName}
                            </p>
                          )}

                          {/* File attachment */}
                          {msg.fileUrl && (
                            <div className="mb-1">
                              {msg.fileType === "image" ? (
                                <img src={msg.fileUrl} alt={msg.fileName || "Image"} className="max-w-[250px] max-h-[200px] rounded-lg object-cover" />
                              ) : (
                                <div className={`flex items-center gap-2 p-2 rounded-lg ${isOwn ? "bg-primary-foreground/10" : "bg-background/50"}`}>
                                  <FileText className="w-4 h-4 flex-shrink-0" />
                                  <span className="text-xs truncate">{msg.fileName || "File"}</span>
                                  <a href={msg.fileUrl} download={msg.fileName} className="ml-auto">
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              )}
                            </div>
                          )}

                          <p className="text-sm break-words whitespace-pre-wrap">
                            {msg.content.split(/(@\w+(?:\s\w+)?)/g).map((part: string, i: number) =>
                              part.startsWith("@") ? (
                                <span key={i} className={`font-semibold ${isOwn ? "text-primary-foreground underline" : "text-primary underline"}`}>
                                  {part}
                                </span>
                              ) : part
                            )}
                          </p>
                          {msg.emoji && <span className="text-lg">{msg.emoji}</span>}
                          <div className={`flex items-center gap-1 mt-1 ${isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            <p className="text-[10px]">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                            {msg.isEdited === 1 && <span className="text-[9px] italic">(edited)</span>}
                          </div>
                        </div>

                        {/* Hover actions */}
                        <div className={`flex gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition ${isOwn ? "justify-end" : ""}`}>
                          <button
                            className="p-1 rounded hover:bg-muted text-muted-foreground"
                            onClick={() => { setReplyTo(msg); setEditingMsg(null); }}
                            title="Reply"
                          >
                            <Reply className="w-3 h-3" />
                          </button>
                          {isOwn && (
                            <>
                              <button
                                className="p-1 rounded hover:bg-muted text-muted-foreground"
                                onClick={() => startEdit(msg)}
                                title="Edit"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteMut.mutate({ id: msg.id })}
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* File preview bar */}
          {pendingFile && (
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/30 border-t flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {pendingFile.type === "image" ? <ImageIcon className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-blue-500" />}
                <span className="font-medium truncate max-w-[300px]">{pendingFile.name}</span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setPendingFile(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Reply / Edit banner */}
          {(replyTo || editingMsg) && (
            <div className="px-4 py-2 bg-muted/50 border-t flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {editingMsg ? (
                  <>
                    <Pencil className="w-3 h-3 text-primary" />
                    <span className="text-primary font-medium">Editing message</span>
                  </>
                ) : (
                  <>
                    <Reply className="w-3 h-3 text-blue-500" />
                    <span className="text-blue-600 font-medium">Replying to {replyTo.userName}</span>
                    <span className="text-muted-foreground truncate max-w-[200px]">{replyTo.content}</span>
                  </>
                )}
              </div>
              <Button
                variant="ghost" size="sm" className="h-6 w-6 p-0"
                onClick={() => { setReplyTo(null); cancelEdit(); }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 border-t flex flex-col gap-2 bg-background">
            {/* @Mention Dropdown */}
            {mentionQuery !== null && mentionSuggestions.length > 0 && (
              <div className="bg-popover border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                {mentionSuggestions.map((m: any, idx: number) => (
                  <button
                    key={m.userId}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition ${idx === mentionIndex ? "bg-accent" : ""}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const cursorPos = inputRef.current?.selectionStart || input.length;
                      const textBefore = input.slice(0, cursorPos);
                      const textAfter = input.slice(cursorPos);
                      const newBefore = textBefore.replace(/@(\w*)$/, `@${m.userName} `);
                      setInput(newBefore + textAfter);
                      setMentionQuery(null);
                      inputRef.current?.focus();
                    }}
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className={`${getAvatarColor(m.userId)} text-white text-[9px]`}>
                        {getInitials(m.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{m.userName}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="p-2 bg-muted rounded-lg grid grid-cols-8 gap-1 max-h-32 overflow-y-auto">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiInsert(emoji)}
                    className="text-xl p-1 rounded hover:bg-background transition flex-shrink-0"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 items-end">
              <Button
                variant="ghost" size="sm" className="h-9 w-9 p-0 flex-shrink-0"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Smile className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost" size="sm" className="h-9 w-9 p-0 flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
                onChange={handleFileSelect}
              />
              <Input
                ref={inputRef}
                placeholder="Type a message..."
                value={input}
                onChange={(e) => {
                  const val = e.target.value;
                  setInput(val);
                  const cursorPos = e.target.selectionStart || val.length;
                  const textBefore = val.slice(0, cursorPos);
                  const atMatch = textBefore.match(/@(\w*)$/);
                  if (atMatch) {
                    setMentionQuery(atMatch[1]);
                    setMentionIndex(0);
                  } else {
                    setMentionQuery(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (mentionQuery !== null && mentionSuggestions.length > 0) {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setMentionIndex((i) => Math.min(i + 1, mentionSuggestions.length - 1));
                      return;
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setMentionIndex((i) => Math.max(i - 1, 0));
                      return;
                    }
                    if (e.key === "Enter" || e.key === "Tab") {
                      e.preventDefault();
                      const selected = mentionSuggestions[mentionIndex];
                      if (selected) {
                        const cursorPos = inputRef.current?.selectionStart || input.length;
                        const textBefore = input.slice(0, cursorPos);
                        const textAfter = input.slice(cursorPos);
                        const newBefore = textBefore.replace(/@(\w*)$/, `@${selected.userName} `);
                        setInput(newBefore + textAfter);
                        setMentionQuery(null);
                      }
                      return;
                    }
                    if (e.key === "Escape") {
                      setMentionQuery(null);
                      return;
                    }
                  }
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={sendMut.isPending || editMut.isPending}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={(!input.trim() && !pendingFile) || sendMut.isPending || editMut.isPending}
                size="sm" className="h-9 flex-shrink-0"
                title="Send message (Ctrl+Enter)"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Create Team Channel Dialog */}
      <Dialog open={showNewChannelDialog} onOpenChange={setShowNewChannelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Hash className="w-4 h-4" /> Create Team Channel</DialogTitle>
            <DialogDescription>Create a channel for a department or team (e.g., ICT, Admin, Finance)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Channel Name</Label>
              <Input
                placeholder="e.g. ICT Team, Finance, Admin"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                placeholder="What is this channel about?"
                value={newChannelDesc}
                onChange={(e) => setNewChannelDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Add Members</Label>
              <div className="border rounded-lg p-2 max-h-[200px] overflow-y-auto space-y-1">
                {members.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">No members found. Start chatting to populate the member list.</p>
                ) : (
                  members.map((m: any) => (
                    <label key={m.userId} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newChannelMembers.includes(m.userId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewChannelMembers([...newChannelMembers, m.userId]);
                          } else {
                            setNewChannelMembers(newChannelMembers.filter(id => id !== m.userId));
                          }
                        }}
                        className="rounded"
                      />
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className={`${getAvatarColor(m.userId)} text-white text-[8px]`}>
                          {getInitials(m.userName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{m.userName}</span>
                    </label>
                  ))
                )}
              </div>
              {newChannelMembers.length > 0 && (
                <p className="text-xs text-muted-foreground">{newChannelMembers.length} member(s) selected</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewChannelDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateTeamChannel} disabled={createChannelMut.isPending}>
              {createChannelMut.isPending ? "Creating..." : "Create Channel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Private Message Dialog */}
      <Dialog open={showNewPrivateDialog} onOpenChange={setShowNewPrivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="w-4 h-4" /> New Private Message</DialogTitle>
            <DialogDescription>Start a private conversation with a team member</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select User</Label>
              <div className="border rounded-lg p-2 max-h-[300px] overflow-y-auto space-y-1">
                {members.filter((m: any) => m.userId !== currentUserId).map((m: any) => (
                  <button
                    key={m.userId}
                    onClick={() => setPrivateRecipient(m.userId)}
                    className={`w-full flex items-center gap-2 p-2 rounded-md text-sm transition ${
                      privateRecipient === m.userId ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className={`${getAvatarColor(m.userId)} text-white text-[9px]`}>
                        {getInitials(m.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{m.userName}</span>
                  </button>
                ))}
                {members.filter((m: any) => m.userId !== currentUserId).length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">No other members found. Users who have sent messages will appear here.</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPrivateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreatePrivateChat} disabled={createChannelMut.isPending || !privateRecipient}>
              {createChannelMut.isPending ? "Creating..." : "Start Chat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}

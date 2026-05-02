import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, ChevronDown, Loader2, Minimize2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at: string;
  other_user?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  unread_count?: number;
  last_message?: string;
}

export function LiveChatWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConvs(true);
    try {
      const { data } = await supabase
        .from('conversations')
        .select(`
          *,
          participant1:participant1_id(id, username, avatar_url),
          participant2:participant2_id(id, username, avatar_url)
        `)
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false })
        .limit(20);

      if (!data) return;

      const convs = await Promise.all(
        data.map(async (conv: any) => {
          const otherUser =
            conv.participant1_id === user.id ? conv.participant2 : conv.participant1;

          const { data: lastMsg } = await supabase
            .from('direct_messages')
            .select('content')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { count } = await supabase
            .from('direct_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          return {
            ...conv,
            other_user: otherUser,
            unread_count: count || 0,
            last_message: lastMsg?.content || '',
          };
        })
      );

      setConversations(convs);
      setTotalUnread(convs.reduce((s, c) => s + (c.unread_count || 0), 0));
    } finally {
      setLoadingConvs(false);
    }
  }, [user]);

  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from('direct_messages')
      .select(`*, sender:sender_id(id, username, avatar_url)`)
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (data) {
      setMessages(data as ChatMessage[]);
      // Mark as read
      await supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('conversation_id', convId)
        .neq('sender_id', user?.id)
        .eq('is_read', false);
    }
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [user]);

  // Poll for new messages
  useEffect(() => {
    if (!open || !user) return;
    loadConversations();
    pollRef.current = setInterval(() => {
      loadConversations();
      if (activeConv) loadMessages(activeConv.id);
    }, 4000);
    return () => clearInterval(pollRef.current);
  }, [open, user, activeConv, loadConversations, loadMessages]);

  const openConversation = async (conv: Conversation) => {
    setActiveConv(conv);
    setView('chat');
    await loadMessages(conv.id);
    loadConversations(); // refresh unread counts
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !activeConv || !user || sending) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);
    try {
      const { data } = await supabase
        .from('direct_messages')
        .insert({
          conversation_id: activeConv.id,
          sender_id: user.id,
          content: text,
        })
        .select(`*, sender:sender_id(id, username, avatar_url)`)
        .single();

      if (data) {
        setMessages(prev => [...prev, data as ChatMessage]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', activeConv.id);
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[100] flex flex-col items-end gap-2">
      {/* Chat panel */}
      {open && (
        <div
          className={`bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
            minimized ? 'h-12 w-72' : 'h-[460px] w-80'
          }`}
          style={{ maxHeight: 'calc(100vh - 160px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60 bg-background/90 backdrop-blur-sm h-12 flex-shrink-0">
            <div className="flex items-center gap-2">
              {view === 'chat' && !minimized && (
                <button
                  onClick={() => { setView('list'); setActiveConv(null); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className="h-4 w-4 rotate-90" />
                </button>
              )}
              <span className="font-semibold text-sm">
                {view === 'chat' && activeConv
                  ? `@${activeConv.other_user?.username}`
                  : 'Messages'}
              </span>
              {totalUnread > 0 && view === 'list' && (
                <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {totalUnread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized(m => !m)}
                className="h-7 w-7 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => { setOpen(false); setView('list'); setActiveConv(null); }}
                className="h-7 w-7 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Conversations list */}
              {view === 'list' && (
                <div className="overflow-y-auto flex-1 h-[calc(460px-48px)]">
                  {loadingConvs && conversations.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground px-4 text-center">
                      <MessageCircle className="h-10 w-10" />
                      <div>
                        <p className="font-medium text-sm">No messages yet</p>
                        <p className="text-xs mt-1">Visit someone's profile to start chatting</p>
                      </div>
                      <button
                        onClick={() => { setOpen(false); navigate('/messages'); }}
                        className="text-xs text-primary hover:underline"
                      >
                        Open full messages →
                      </button>
                    </div>
                  ) : (
                    <div>
                      {conversations.map(conv => (
                        <button
                          key={conv.id}
                          onClick={() => openConversation(conv)}
                          className="w-full flex items-center gap-3 px-3 py-3 hover:bg-accent transition-colors border-b border-border/40 last:border-0"
                        >
                          <div className="relative flex-shrink-0">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={conv.other_user?.avatar_url} />
                              <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary to-purple-500 text-white">
                                {conv.other_user?.username?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center justify-between">
                              <span className={`text-sm ${conv.unread_count ? 'font-bold' : 'font-medium'}`}>
                                @{conv.other_user?.username}
                              </span>
                              {conv.unread_count ? (
                                <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                                  {conv.unread_count}
                                </span>
                              ) : null}
                            </div>
                            {conv.last_message && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message}</p>
                            )}
                          </div>
                        </button>
                      ))}
                      <button
                        onClick={() => { setOpen(false); navigate('/messages'); }}
                        className="w-full text-xs text-primary py-3 hover:bg-accent transition-colors"
                      >
                        Open full messages →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Chat view */}
              {view === 'chat' && activeConv && (
                <div className="flex flex-col h-[calc(460px-48px)]">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        Start the conversation!
                      </div>
                    ) : (
                      messages.map(msg => {
                        const isOwn = msg.sender_id === user.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-2`}
                          >
                            {!isOwn && (
                              <Avatar className="h-6 w-6 flex-shrink-0 mt-auto">
                                <AvatarImage src={msg.sender?.avatar_url} />
                                <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary to-purple-500 text-white">
                                  {msg.sender?.username?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div
                              className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                isOwn
                                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                                  : 'bg-muted text-foreground rounded-bl-sm'
                              }`}
                            >
                              {msg.content}
                              <div className={`text-[10px] mt-1 ${isOwn ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground'}`}>
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="border-t border-border/60 p-2 flex items-center gap-2 bg-background/90">
                    <input
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder="Type a message..."
                      className="flex-1 bg-muted rounded-full px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/40 min-w-0"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!inputText.trim() || sending}
                      className="h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center disabled:opacity-40 transition-all active:scale-90 flex-shrink-0"
                    >
                      {sending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => { setOpen(o => !o); setMinimized(false); }}
        className={`h-12 w-12 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 active:scale-90 relative ${
          open ? 'bg-foreground text-background' : 'bg-primary text-primary-foreground'
        }`}
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
        {!open && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>
    </div>
  );
}

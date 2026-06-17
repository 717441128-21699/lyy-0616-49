import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  ArrowLeft,
  CheckCircle,
  Clock,
  Loader2,
  MessageCircleOff,
} from 'lucide-react';
import { conversationsApi } from '../lib/api.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { CATEGORY_MAP } from '../../shared/types.js';
import type {
  Conversation,
  Message,
  User,
} from '../../shared/types.js';
import Empty from '../components/Empty.js';
import { cn } from '../lib/utils.js';

type ConversationItem = Conversation & {
  otherUser: Partial<User>;
  postTitle?: string;
  lastMessage?: { content: string; createdAt: string; senderId: number };
  unreadCount: number;
};

type MessageItem = Message & {
  sender: Partial<User>;
};

export default function Messages() {
  const navigate = useNavigate();
  const { id: urlConversationId } = useParams<{ id: string }>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationItem | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [showMobileMessages, setShowMobileMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    loadConversations();
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (urlConversationId && conversations.length > 0) {
      const conv = conversations.find((c) => c.id === Number(urlConversationId));
      if (conv) {
        handleSelectConversation(conv, false);
      }
    }
  }, [urlConversationId, conversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    setConversationsLoading(true);
    try {
      const res = await conversationsApi.getList();
      if (res.success && res.data) {
        setConversations(res.data);
      }
    } catch (error) {
      console.error('加载会话列表失败:', error);
    } finally {
      setConversationsLoading(false);
    }
  };

  const loadMessages = async (conversationId: number) => {
    setMessagesLoading(true);
    try {
      const res = await conversationsApi.getMessages(conversationId);
      if (res.success && res.data) {
        setMessages(res.data);
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
          )
        );
      }
    } catch (error) {
      console.error('加载消息失败:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSelectConversation = (conversation: ConversationItem, doNavigate = true) => {
    setSelectedConversation(conversation);
    setShowMobileMessages(true);
    loadMessages(conversation.id);
    if (doNavigate) {
      navigate(`/messages/${conversation.id}`);
    }
  };

  const handleBackToList = () => {
    setShowMobileMessages(false);
    setSelectedConversation(null);
    navigate('/messages');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sendLoading) return;

    setSendLoading(true);
    try {
      const res = await conversationsApi.sendMessage(selectedConversation.id, {
        content: newMessage.trim(),
      });
      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data]);
        setNewMessage('');
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedConversation.id
              ? {
                  ...conv,
                  lastMessage: {
                    content: res.data.content,
                    createdAt: res.data.createdAt,
                    senderId: res.data.senderId,
                  } as ConversationItem['lastMessage'],
                }
              : conv
          )
        );
      }
    } catch (error) {
      console.error('发送消息失败:', error);
    } finally {
      setSendLoading(false);
    }
  };

  const handleConfirmService = () => {
    if (selectedConversation?.postId) {
      navigate(`/service-confirm/${selectedConversation.postId}`);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const isMyMessage = (message: MessageItem) => {
    return message.senderId === user?.id;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row">
        <div
          className={cn(
            'w-full md:w-[30%] border-r border-neutral-200 bg-white flex flex-col',
            showMobileMessages ? 'hidden md:flex' : 'flex'
          )}
        >
          <div className="p-4 border-b border-neutral-200">
            <h1 className="section-title mb-0 text-2xl">消息中心</h1>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversationsLoading ? (
              <div className="flex items-center justify-center h-full py-12">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              </div>
            ) : conversations.length > 0 ? (
              <div className="divide-y divide-neutral-100">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={cn(
                      'w-full p-4 flex gap-3 hover:bg-neutral-50 transition-colors text-left',
                      selectedConversation?.id === conv.id && 'bg-primary-50'
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white font-medium">
                        {conv.otherUser.username?.charAt(0)}
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1">
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-neutral-800 truncate">
                          {conv.otherUser.username}
                        </span>
                        <span className="text-xs text-neutral-400 flex-shrink-0 ml-2">
                          {conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : formatTime(conv.createdAt)}
                        </span>
                      </div>
                      {conv.postTitle && (
                        <p className="text-xs text-neutral-500 mb-1 truncate">
                          关于: {conv.postTitle}
                        </p>
                      )}
                      <p className="text-sm text-neutral-500 truncate">
                        {conv.lastMessage ? conv.lastMessage.content : '开始对话吧'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <Empty
                icon={MessageCircleOff}
                title="暂无会话"
                description="还没有任何对话，去服务广场找到需要的服务开始交流吧"
              />
            )}
          </div>
        </div>

        <div
          className={cn(
            'w-full md:w-[70%] flex flex-col bg-white',
            showMobileMessages ? 'flex' : 'hidden md:flex'
          )}
        >
          {selectedConversation ? (
            <>
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBackToList}
                    className="md:hidden p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white font-medium">
                    {selectedConversation.otherUser.username?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-neutral-800">
                      {selectedConversation.otherUser.username}
                    </p>
                    {selectedConversation.postTitle && (
                      <p className="text-xs text-neutral-500">
                        关于: {selectedConversation.postTitle}
                      </p>
                    )}
                  </div>
                </div>
                {selectedConversation.postId && (
                  <button
                    onClick={handleConfirmService}
                    className="btn btn-primary text-sm py-2 px-4 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    发起服务确认
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((msg, index) => {
                    const mine = isMyMessage(msg);
                    const showAvatar =
                      index === 0 || messages[index - 1].senderId !== msg.senderId;

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex gap-2',
                          mine ? 'flex-row-reverse' : 'flex-row'
                        )}
                      >
                        {showAvatar ? (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                            {msg.sender.username?.charAt(0)}
                          </div>
                        ) : (
                          <div className="w-8 flex-shrink-0" />
                        )}
                        <div
                          className={cn(
                            'max-w-[70%]',
                            mine ? 'items-end' : 'items-start'
                          )}
                        >
                          {showAvatar && (
                            <p
                              className={cn(
                                'text-xs text-neutral-500 mb-1',
                                mine ? 'text-right' : 'text-left'
                              )}
                            >
                              {msg.sender.username}
                            </p>
                          )}
                          <div
                            className={cn(
                              'px-4 py-2 rounded-2xl',
                              mine
                                ? 'bg-primary-500 text-white rounded-tr-sm'
                                : 'bg-white text-neutral-800 rounded-tl-sm border border-neutral-200'
                            )}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <p
                            className={cn(
                              'text-xs text-neutral-400 mt-1',
                              mine ? 'text-right' : 'text-left'
                            )}
                          >
                            {formatMessageTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Empty
                      icon={MessageSquare}
                      title="开始对话"
                      description="打个招呼，开始你们的服务交流吧"
                    />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-neutral-200 bg-white"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="输入消息..."
                    className="input flex-1"
                    disabled={sendLoading}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!newMessage.trim() || sendLoading}
                  >
                    {sendLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <Empty
                icon={MessageSquare}
                title="选择会话"
                description="从左侧选择一个会话开始查看消息"
                className="hidden md:flex"
              />
              <Empty
                icon={MessageSquare}
                title="选择会话"
                description="从左侧选择一个会话开始查看消息"
                className="md:hidden"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

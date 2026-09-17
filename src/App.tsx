import { useCallback, useEffect, useMemo, useState } from 'react';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import { useNotifications } from './hooks/useNotifications';
import { sendMessage as sendMessageRequest } from './api/greenApi';
import { notificationToMessage } from './utils/chat';
import {
  clearCredentials,
  loadCredentials,
  loadHistory,
  saveCredentials,
  saveHistory,
} from './utils/storage';
import type { ChatMessage, Credentials, History, NotificationBody } from './types';

const EMPTY_HISTORY: History = { chats: [], messages: {} };

export default function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(() => loadCredentials());
  const [history, setHistory] = useState<History>(EMPTY_HISTORY);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  /* История переписки своя у каждого инстанса. */
  useEffect(() => {
    setHistory(credentials ? loadHistory(credentials.idInstance) : EMPTY_HISTORY);
    setActiveChatId(null);
  }, [credentials]);

  useEffect(() => {
    if (credentials) saveHistory(credentials.idInstance, history);
  }, [credentials, history]);

  const upsertMessage = useCallback((message: ChatMessage) => {
    setHistory((previous) => {
      const chatMessages = previous.messages[message.chatId] || [];
      const index = chatMessages.findIndex((item) => item.id && item.id === message.id);

      const nextMessages =
        index >= 0
          ? chatMessages.map((item, i) => (i === index ? { ...item, ...message } : item))
          : [...chatMessages, message].sort((a, b) => a.timestamp - b.timestamp);

      const known = previous.chats.some((chat) => chat.id === message.chatId);
      const nextChats = known
        ? previous.chats
        : [
            { id: message.chatId, name: message.senderName ?? null, unread: 0 },
            ...previous.chats,
          ];

      return {
        chats: nextChats,
        messages: { ...previous.messages, [message.chatId]: nextMessages },
      };
    });
  }, []);

  const handleNotification = useCallback(
    (body: NotificationBody) => {
      if (!body) return;

      if (body.typeWebhook === 'outgoingMessageStatus') {
        setHistory((previous) => {
          const next = { ...previous.messages };
          let changed = false;

          for (const [chatId, list] of Object.entries(next)) {
            const index = list.findIndex((item) => item.id === body.idMessage);
            if (index >= 0) {
              next[chatId] = list.map((item, i) =>
                i === index ? { ...item, status: body.status } : item,
              );
              changed = true;
              break;
            }
          }

          return changed ? { ...previous, messages: next } : previous;
        });
        return;
      }

      const message = notificationToMessage(body);
      if (!message) return;

      upsertMessage(message);

      if (message.direction === 'in') {
        setHistory((previous) => ({
          ...previous,
          chats: previous.chats.map((chat) =>
            chat.id === message.chatId && chat.id !== activeChatId
              ? { ...chat, unread: (chat.unread || 0) + 1 }
              : chat,
          ),
        }));
      }
    },
    [activeChatId, upsertMessage],
  );

  const { connection } = useNotifications({
    credentials,
    enabled: Boolean(credentials),
    onNotification: handleNotification,
  });

  function handleLogin(next: Credentials) {
    saveCredentials(next);
    setCredentials(next);
  }

  function handleLogout() {
    clearCredentials();
    setCredentials(null);
  }

  function handleSelectChat(chatId: string) {
    setActiveChatId(chatId);
    setSendError(null);
    setHistory((previous) => ({
      ...previous,
      chats: previous.chats.map((chat) => (chat.id === chatId ? { ...chat, unread: 0 } : chat)),
    }));
  }

  function handleCreateChat(chatId: string) {
    setHistory((previous) =>
      previous.chats.some((chat) => chat.id === chatId)
        ? previous
        : { ...previous, chats: [{ id: chatId, name: null, unread: 0 }, ...previous.chats] },
    );
    handleSelectChat(chatId);
  }

  async function handleSend(chatId: string, text: string): Promise<boolean> {
    if (!credentials) return false;
    setSendError(null);

    const localId = `local-${Date.now()}`;
    upsertMessage({
      id: localId,
      chatId,
      text,
      direction: 'out',
      timestamp: Date.now(),
      status: 'pending',
    });

    try {
      const response = await sendMessageRequest(credentials, { chatId, message: text });

      setHistory((previous) => ({
        ...previous,
        messages: {
          ...previous.messages,
          [chatId]: (previous.messages[chatId] || []).map((item) =>
            item.id === localId
              ? { ...item, id: response?.idMessage || localId, status: 'sent' as const }
              : item,
          ),
        },
      }));

      return true;
    } catch (error) {
      setSendError((error as Error).message);
      setHistory((previous) => ({
        ...previous,
        messages: {
          ...previous.messages,
          [chatId]: (previous.messages[chatId] || []).map((item) =>
            item.id === localId ? { ...item, status: 'failed' as const } : item,
          ),
        },
      }));

      return false;
    }
  }

  const sortedChats = useMemo(() => {
    const lastTime = (chatId: string) => {
      const list = history.messages[chatId] || [];
      return list.length ? list[list.length - 1].timestamp : 0;
    };
    return [...history.chats].sort((a, b) => lastTime(b.id) - lastTime(a.id));
  }, [history]);

  if (!credentials) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const activeChat = history.chats.find((chat) => chat.id === activeChatId) || null;

  return (
    <div className={`layout ${activeChatId ? 'layout--chat-open' : ''}`}>
      <Sidebar
        chats={sortedChats}
        messages={history.messages}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onCreateChat={handleCreateChat}
        onLogout={handleLogout}
        idInstance={credentials.idInstance}
        connection={connection}
      />
      <ChatWindow
        chat={activeChat}
        messages={activeChat ? history.messages[activeChat.id] || [] : []}
        onSend={handleSend}
        onBack={() => setActiveChatId(null)}
        sendError={sendError}
      />
    </div>
  );
}

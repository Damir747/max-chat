import { useState } from 'react';
import type { FormEvent } from 'react';
import { chatTitle, formatTime, initials, toChatId } from '../utils/chat';
import type { Chat, ChatMessage } from '../types';
import type { ConnectionState } from '../hooks/useNotifications';

interface Props {
  chats: Chat[];
  messages: Record<string, ChatMessage[]>;
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: (chatId: string) => void;
  onLogout: () => void;
  idInstance: string;
  connection: ConnectionState;
}

const STATUS_TEXT: Record<ConnectionState, string> = {
  listening: 'На связи',
  error: 'Нет соединения',
  idle: 'Подключение',
};

export default function Sidebar({
  chats,
  messages,
  activeChatId,
  onSelectChat,
  onCreateChat,
  onLogout,
  idInstance,
  connection,
}: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const chatId = toChatId(value);

    if (!chatId) {
      setError('Введите номер телефона получателя, например 79991234567.');
      return;
    }

    onCreateChat(chatId);
    setValue('');
    setError(null);
  }

  return (
    <aside className="sidebar">
      <header className="sidebar__head">
        <div>
          <div className="sidebar__brand">MAX</div>
          <div className="sidebar__account">
            Инстанс {idInstance}
            <span className={`dot dot--${connection}`} aria-hidden="true" />
            <span className="sidebar__status">{STATUS_TEXT[connection]}</span>
          </div>
        </div>
        <button type="button" className="button button--ghost" onClick={onLogout}>
          Выйти
        </button>
      </header>

      <form className="sidebar__new" onSubmit={handleSubmit}>
        <input
          className="field__input"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          placeholder="Номер получателя"
          inputMode="tel"
          aria-label="Номер телефона получателя"
        />
        <button type="submit" className="button button--primary">
          Создать чат
        </button>
      </form>
      {error && <p className="sidebar__error">{error}</p>}

      <div className="sidebar__list">
        {chats.length === 0 && (
          <p className="sidebar__empty">
            Чатов пока нет. Введите номер получателя, чтобы начать переписку.
          </p>
        )}

        {chats.map((chat) => {
          const chatMessages = messages[chat.id] || [];
          const last = chatMessages[chatMessages.length - 1];
          const title = chatTitle(chat);

          return (
            <button
              type="button"
              key={chat.id}
              className={`chat-item ${chat.id === activeChatId ? 'chat-item--active' : ''}`}
              onClick={() => onSelectChat(chat.id)}
            >
              <span className="avatar" aria-hidden="true">
                {initials(title)}
              </span>
              <span className="chat-item__body">
                <span className="chat-item__top">
                  <span className="chat-item__title">{title}</span>
                  {last && <span className="chat-item__time">{formatTime(last.timestamp)}</span>}
                </span>
                <span className="chat-item__preview">
                  {last ? `${last.direction === 'out' ? 'Вы: ' : ''}${last.text}` : 'Нет сообщений'}
                </span>
              </span>
              {chat.unread > 0 && <span className="chat-item__badge">{chat.unread}</span>}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

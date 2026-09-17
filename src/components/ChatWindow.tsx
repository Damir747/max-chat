import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { chatTitle, formatDay, formatTime, initials, STATUS_LABEL } from '../utils/chat';
import type { Chat, ChatMessage } from '../types';

interface Props {
  chat: Chat | null;
  messages: ChatMessage[];
  onSend: (chatId: string, text: string) => Promise<boolean>;
  onBack: () => void;
  sendError: string | null;
}

export default function ChatWindow({ chat, messages, onSend, onBack, sendError }: Props) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const feed = feedRef.current;
    if (feed) feed.scrollTop = feed.scrollHeight;
  }, [messages, chat?.id]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [chat?.id]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending || !chat) return;

    setSending(true);
    const delivered = await onSend(chat.id, text);
    setSending(false);

    if (delivered) setDraft('');
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend(event);
    }
  }

  if (!chat) {
    return (
      <section className="window window--empty">
        <div className="window__placeholder">
          <div className="window__placeholder-mark" aria-hidden="true">
            MAX
          </div>
          <h2>Выберите чат</h2>
          <p>Откройте переписку слева или создайте новую по номеру телефона.</p>
        </div>
      </section>
    );
  }

  const title = chatTitle(chat);

  return (
    <section className="window">
      <header className="window__head">
        <button type="button" className="window__back" onClick={onBack} aria-label="К списку чатов">
          ←
        </button>
        <span className="avatar" aria-hidden="true">
          {initials(title)}
        </span>
        <div>
          <div className="window__title">{title}</div>
          <div className="window__subtitle">{chat.id}</div>
        </div>
      </header>

      <div className="window__feed" ref={feedRef}>
        {messages.length === 0 && (
          <p className="window__hint">
            Здесь появятся сообщения. Напишите первым — ответ получателя придёт в этот чат.
          </p>
        )}

        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const showDay =
            !previous || formatDay(previous.timestamp) !== formatDay(message.timestamp);

          return (
            <div key={message.id || `${message.timestamp}-${index}`}>
              {showDay && <div className="day">{formatDay(message.timestamp)}</div>}
              <div className={`bubble bubble--${message.direction}`}>
                <span className="bubble__text">{message.text}</span>
                <span className="bubble__meta">
                  {formatTime(message.timestamp)}
                  {message.direction === 'out' && message.status && (
                    <span
                      className={`bubble__status ${
                        message.status === 'failed' ? 'bubble__status--failed' : ''
                      }`}
                    >
                      {STATUS_LABEL[message.status] || message.status}
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {sendError && <p className="window__error">{sendError}</p>}

      <form className="composer" onSubmit={handleSend}>
        <textarea
          ref={inputRef}
          className="composer__input"
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, 4000))}
          onKeyDown={handleKeyDown}
          placeholder="Напишите сообщение"
          rows={1}
          maxLength={4000}
        />
        <button
          type="submit"
          className="button button--send"
          disabled={!draft.trim() || sending}
          aria-label="Отправить сообщение"
        >
          {sending ? '…' : '↑'}
        </button>
      </form>
    </section>
  );
}

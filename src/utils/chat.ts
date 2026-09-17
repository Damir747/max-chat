import type { Chat, ChatMessage, MessageData, MessageStatus, NotificationBody } from '../types';

/** Оставляет только цифры и приводит российские номера к формату 7XXXXXXXXXX. */
export function normalizePhone(value: string | number): string {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (digits.length === 10) digits = `7${digits}`;
  return digits;
}

/**
 * Превращает пользовательский ввод в идентификатор чата.
 * Принимает номер телефона (79991234567, +7 999 123-45-67, 8 999…)
 * либо готовый chatId вида 79991234567@c.us / -10000000000000 / 10000000.
 */
export function toChatId(value: string): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (raw.includes('@')) return raw;
  if (raw.startsWith('-')) return raw;

  const phone = normalizePhone(raw);
  if (phone.length < 10) return null;
  return `${phone}@c.us`;
}

export function isPhoneChat(chatId: string): boolean {
  return String(chatId ?? '').endsWith('@c.us');
}

/** Человекочитаемое имя чата: +7 999 123-45-67 либо сам идентификатор. */
export function chatTitle(chat: Pick<Chat, 'id' | 'name'>): string {
  if (chat.name) return chat.name;
  const id = chat.id || '';
  if (!isPhoneChat(id)) return id;

  const digits = id.replace('@c.us', '');
  if (digits.length === 11 && digits.startsWith('7')) {
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
  }
  return `+${digits}`;
}

export function initials(title: string): string {
  const cleaned = title.replace(/[^0-9A-Za-zА-Яа-яЁё]/g, '');
  if (!cleaned) return '#';
  if (/^\d+$/.test(cleaned)) return cleaned.slice(-2);
  return cleaned.slice(0, 2).toUpperCase();
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDay(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return 'Сегодня';
  if (sameDay(date, yesterday)) return 'Вчера';

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

/** Текст сообщения из messageData; для нетекстовых типов возвращает null. */
export function extractText(messageData?: MessageData): string | null {
  if (!messageData) return null;

  switch (messageData.typeMessage) {
    case 'textMessage':
      return messageData.textMessageData?.textMessage ?? null;
    case 'extendedTextMessage':
    case 'quotedMessage':
      return (
        messageData.extendedTextMessageData?.text ??
        messageData.textMessageData?.textMessage ??
        null
      );
    default:
      return messageData.textMessageData?.textMessage ?? null;
  }
}

/**
 * Приводит уведомление GREEN-API к модели сообщения приложения.
 * Возвращает null, если уведомление не относится к текстовой переписке.
 */
export function notificationToMessage(body: NotificationBody | null | undefined): ChatMessage | null {
  const type = body?.typeWebhook;
  const incoming = type === 'incomingMessageReceived';
  const outgoing = type === 'outgoingMessageReceived' || type === 'outgoingAPIMessageReceived';
  if (!body || (!incoming && !outgoing)) return null;

  const text = extractText(body.messageData);
  if (!text) return null;

  const chatId = body.senderData?.chatId;
  if (!chatId) return null;

  return {
    id: body.idMessage ?? `received-${Date.now()}`,
    chatId,
    text,
    direction: incoming ? 'in' : 'out',
    timestamp: (body.timestamp || Math.floor(Date.now() / 1000)) * 1000,
    status: outgoing ? 'sent' : undefined,
    senderName: incoming ? body.senderData?.senderName || body.senderData?.chatName || null : null,
  };
}

export const STATUS_LABEL: Record<MessageStatus, string> = {
  pending: 'Отправляется',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не отправлено',
};

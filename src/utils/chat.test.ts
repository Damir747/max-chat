import { describe, expect, it } from 'vitest';
import {
  chatTitle,
  extractText,
  initials,
  normalizePhone,
  notificationToMessage,
  toChatId,
} from './chat';
import type { NotificationBody } from '../types';

describe('normalizePhone', () => {
  it('убирает разделители', () => {
    expect(normalizePhone('+7 (999) 123-45-67')).toBe('79991234567');
  });

  it('заменяет ведущую восьмёрку на семёрку', () => {
    expect(normalizePhone('8 999 123 45 67')).toBe('79991234567');
  });

  it('достраивает код страны для десятизначного номера', () => {
    expect(normalizePhone('9991234567')).toBe('79991234567');
  });
});

describe('toChatId', () => {
  it('превращает номер в идентификатор личного чата', () => {
    expect(toChatId('+7 999 123-45-67')).toBe('79991234567@c.us');
  });

  it('оставляет готовый идентификатор без изменений', () => {
    expect(toChatId('79991234567@c.us')).toBe('79991234567@c.us');
    expect(toChatId('-10000000000000')).toBe('-10000000000000');
  });

  it('отклоняет пустой и слишком короткий ввод', () => {
    expect(toChatId('')).toBeNull();
    expect(toChatId('12345')).toBeNull();
  });
});

describe('chatTitle и initials', () => {
  it('форматирует российский номер', () => {
    expect(chatTitle({ id: '79991234567@c.us', name: null })).toBe('+7 999 123-45-67');
  });

  it('предпочитает имя собеседника', () => {
    expect(chatTitle({ id: '79991234567@c.us', name: 'Анна' })).toBe('Анна');
  });

  it('берёт последние цифры номера для аватара', () => {
    expect(initials('+7 999 123-45-67')).toBe('67');
    expect(initials('Анна')).toBe('АН');
  });
});

describe('extractText', () => {
  it('читает обычное текстовое сообщение', () => {
    expect(
      extractText({ typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет' } }),
    ).toBe('Привет');
  });

  it('читает расширенное текстовое сообщение', () => {
    expect(
      extractText({ typeMessage: 'extendedTextMessage', extendedTextMessageData: { text: 'Ссылка' } }),
    ).toBe('Ссылка');
  });

  it('возвращает null для нетекстовых типов', () => {
    expect(extractText({ typeMessage: 'imageMessage' })).toBeNull();
    expect(extractText(undefined)).toBeNull();
  });
});

describe('notificationToMessage', () => {
  const incoming: NotificationBody = {
    typeWebhook: 'incomingMessageReceived',
    idMessage: 'BAE5F4886F6A2A63',
    timestamp: 1_700_000_000,
    senderData: { chatId: '79991234567@c.us', senderName: 'Анна' },
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет!' } },
  };

  it('разбирает входящее сообщение', () => {
    expect(notificationToMessage(incoming)).toEqual({
      id: 'BAE5F4886F6A2A63',
      chatId: '79991234567@c.us',
      text: 'Привет!',
      direction: 'in',
      timestamp: 1_700_000_000_000,
      status: undefined,
      senderName: 'Анна',
    });
  });

  it('помечает исходящее сообщение как отправленное', () => {
    const message = notificationToMessage({
      ...incoming,
      typeWebhook: 'outgoingAPIMessageReceived',
    });

    expect(message?.direction).toBe('out');
    expect(message?.status).toBe('sent');
  });

  it('игнорирует статусы, состояния и нетекстовые сообщения', () => {
    expect(
      notificationToMessage({
        typeWebhook: 'outgoingMessageStatus',
        idMessage: 'BAE5F4886F6A2A63',
        status: 'delivered',
      }),
    ).toBeNull();

    expect(notificationToMessage({ typeWebhook: 'stateInstanceChanged' })).toBeNull();

    expect(
      notificationToMessage({ ...incoming, messageData: { typeMessage: 'imageMessage' } }),
    ).toBeNull();

    expect(notificationToMessage(null)).toBeNull();
  });

  it('пропускает уведомление без идентификатора чата', () => {
    expect(notificationToMessage({ ...incoming, senderData: undefined })).toBeNull();
  });
});

import type {
  CheckAccountResponse,
  Credentials,
  InstanceSettings,
  Notification,
  SendMessageResponse,
  StateInstanceResponse,
} from '../types';

/**
 * Тонкий клиент GREEN-API (мессенджер MAX).
 *
 * Все методы вызываются по единому шаблону:
 *   {apiUrl}/waInstance{idInstance}/{method}/{apiTokenInstance}
 * Префикс v3 является необязательным, поэтому не используется.
 */

export const DEFAULT_API_URL = 'https://api.green-api.com';

interface ApiErrorOptions {
  status?: number;
  method?: string;
  payload?: unknown;
}

export class ApiError extends Error {
  status?: number;
  method?: string;
  payload?: unknown;

  constructor(message: string, { status, method, payload }: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.method = method;
    this.payload = payload;
  }
}

interface RequestOptions {
  httpMethod?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number>;
  tail?: string;
  signal?: AbortSignal;
}

function baseUrl(
  { apiUrl, idInstance, apiTokenInstance }: Credentials,
  method: string,
  tail = '',
): string {
  const root = (apiUrl || DEFAULT_API_URL).replace(/\/+$/, '');
  return `${root}/waInstance${idInstance}/${method}/${apiTokenInstance}${tail}`;
}

async function request<T>(
  credentials: Credentials,
  method: string,
  options: RequestOptions = {},
): Promise<T> {
  const { httpMethod = 'GET', body, query, tail = '', signal } = options;

  let url = baseUrl(credentials, method, tail);
  if (query) {
    const search = new URLSearchParams(
      Object.entries(query).map(([key, value]) => [key, String(value)]),
    ).toString();
    if (search) url += `?${search}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: httpMethod,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(
      'Сервер GREEN-API недоступен. Проверьте подключение к сети и адрес apiUrl.',
      { method },
    );
  }

  const raw = await response.text();
  let data: unknown = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  if (!response.ok) {
    throw new ApiError(describeError(response.status, data, method), {
      status: response.status,
      method,
      payload: data,
    });
  }

  return data as T;
}

function describeError(status: number, data: unknown, method: string): string {
  const record = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const detail =
    (typeof record.message === 'string' && record.message) ||
    (typeof record.error === 'string' && record.error) ||
    (typeof record.description === 'string' && record.description) ||
    (typeof data === 'string' ? data : '') ||
    '';

  if (status === 401) return 'Неверный idInstance или apiTokenInstance.';
  if (status === 403)
    return 'Доступ запрещён: на аккаунте действуют ограничения или у токена нет прав на этот метод.';
  if (status === 429)
    return 'Превышен лимит запросов в секунду. Подождите несколько секунд и повторите.';
  if (status === 466) return 'Исчерпан лимит запросов инстанса или инстанс не оплачен.';

  return `Метод ${method} вернул ошибку ${status}${detail ? `: ${detail}` : ''}.`;
}

/* ---------------------------------- аккаунт --------------------------------- */

export function getStateInstance(credentials: Credentials, signal?: AbortSignal) {
  return request<StateInstanceResponse>(credentials, 'getStateInstance', { signal });
}

export function getSettings(credentials: Credentials, signal?: AbortSignal) {
  return request<InstanceSettings>(credentials, 'getSettings', { signal });
}

/** Включает приём уведомлений по HTTP API: webhookUrl должен быть пустым. */
export function setSettings(
  credentials: Credentials,
  settings: InstanceSettings,
  signal?: AbortSignal,
) {
  return request<{ saveSettings: boolean }>(credentials, 'setSettings', {
    httpMethod: 'POST',
    body: settings,
    signal,
  });
}

/** Выход из аккаунта мессенджера на стороне инстанса. */
export function logoutInstance(credentials: Credentials, signal?: AbortSignal) {
  return request<{ isLogout: boolean }>(credentials, 'logout', { signal });
}

/** Проверка, зарегистрирован ли номер в MAX. Поддерживается не всеми тарифами. */
export function checkAccount(
  credentials: Credentials,
  phoneNumber: string | number,
  signal?: AbortSignal,
) {
  return request<CheckAccountResponse>(credentials, 'checkAccount', {
    httpMethod: 'POST',
    body: { phoneNumber: Number(phoneNumber) },
    signal,
  });
}

/* --------------------------------- отправка --------------------------------- */

export function sendMessage(
  credentials: Credentials,
  payload: { chatId: string; message: string; quotedMessageId?: string },
  signal?: AbortSignal,
) {
  const { chatId, message, quotedMessageId } = payload;
  return request<SendMessageResponse>(credentials, 'sendMessage', {
    httpMethod: 'POST',
    body: quotedMessageId ? { chatId, message, quotedMessageId } : { chatId, message },
    signal,
  });
}

/* ----------------------------------- приём ---------------------------------- */

/**
 * Возвращает одно уведомление из очереди либо null, если очередь пуста.
 * Запрос держится открытым до receiveTimeout секунд (long polling).
 */
export function receiveNotification(
  credentials: Credentials,
  { receiveTimeout = 10, signal }: { receiveTimeout?: number; signal?: AbortSignal } = {},
) {
  return request<Notification | null>(credentials, 'receiveNotification', {
    query: { receiveTimeout },
    signal,
  });
}

/** Подтверждает обработку уведомления и удаляет его из очереди. */
export function deleteNotification(
  credentials: Credentials,
  receiptId: number,
  signal?: AbortSignal,
) {
  return request<{ result: boolean }>(credentials, 'deleteNotification', {
    httpMethod: 'DELETE',
    tail: `/${receiptId}`,
    signal,
  });
}

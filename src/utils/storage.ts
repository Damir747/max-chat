import type { Credentials, History } from '../types';

const PREFIX = 'green-api-max';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* приватный режим браузера — работаем без сохранения */
  }
}

const credentialsKey = `${PREFIX}:credentials`;
const historyKey = (idInstance: string) => `${PREFIX}:${idInstance}:history`;

export function loadCredentials(): Credentials | null {
  return read<Credentials | null>(credentialsKey, null);
}

export function saveCredentials(credentials: Credentials): void {
  write(credentialsKey, credentials);
}

export function clearCredentials(): void {
  try {
    localStorage.removeItem(credentialsKey);
  } catch {
    /* no-op */
  }
}

/** История переписки хранится отдельно для каждого инстанса. */
export function loadHistory(idInstance: string): History {
  return read<History>(historyKey(idInstance), { chats: [], messages: {} });
}

export function saveHistory(idInstance: string, history: History): void {
  write(historyKey(idInstance), history);
}

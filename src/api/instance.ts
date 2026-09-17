import { getSettings, setSettings } from './greenApi';
import type { Credentials, InstanceSettings } from '../types';

export const REQUIRED_NOTIFICATIONS: InstanceSettings = {
  webhookUrl: '',
  incomingWebhook: 'yes',
  outgoingWebhook: 'yes',
  outgoingAPIMessageWebhook: 'yes',
  stateWebhook: 'yes',
};

/**
 * Для приёма сообщений по HTTP API webhookUrl должен быть пустым,
 * а нужные виды уведомлений — включены. Настройки правятся только
 * при расхождении: SetSettings перезапускает инстанс.
 */
export async function ensureNotifications(credentials: Credentials): Promise<void> {
  let current: InstanceSettings | null = null;

  try {
    current = await getSettings(credentials);
  } catch {
    return;
  }

  if (!current) return;

  const needsUpdate = Object.entries(REQUIRED_NOTIFICATIONS).some(([key, value]) =>
    key === 'webhookUrl'
      ? (current?.webhookUrl ?? '') !== ''
      : key in current! && current![key] !== value,
  );

  if (needsUpdate) {
    await setSettings(credentials, REQUIRED_NOTIFICATIONS);
  }
}

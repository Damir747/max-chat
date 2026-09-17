import { useEffect, useRef, useState } from 'react';
import { deleteNotification, receiveNotification } from '../api/greenApi';
import type { Credentials, NotificationBody } from '../types';

export type ConnectionState = 'idle' | 'listening' | 'error';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Options {
  credentials: Credentials | null;
  enabled: boolean;
  onNotification: (body: NotificationBody) => void;
}

/**
 * Непрерывно читает очередь уведомлений инстанса:
 * ReceiveNotification → обработка → DeleteNotification.
 * Порядок FIFO сохраняется, потому что следующий запрос уходит
 * только после подтверждения предыдущего уведомления.
 */
export function useNotifications({ credentials, enabled, onNotification }: Options) {
  const [connection, setConnection] = useState<ConnectionState>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const handlerRef = useRef(onNotification);
  handlerRef.current = onNotification;

  useEffect(() => {
    if (!enabled || !credentials) {
      setConnection('idle');
      return undefined;
    }

    const controller = new AbortController();
    const account = credentials;
    let stopped = false;

    async function loop() {
      setConnection('listening');

      while (!stopped) {
        try {
          const notification = await receiveNotification(account, {
            receiveTimeout: 10,
            signal: controller.signal,
          });

          if (stopped) break;
          setConnection('listening');
          setLastError(null);

          if (notification?.receiptId) {
            try {
              handlerRef.current?.(notification.body);
            } finally {
              await deleteNotification(account, notification.receiptId, controller.signal);
            }
          }
        } catch (error) {
          if (stopped || (error as Error).name === 'AbortError') break;
          setConnection('error');
          setLastError((error as Error).message);
          await sleep(5000);
        }
      }
    }

    void loop();

    return () => {
      stopped = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, credentials?.apiUrl, credentials?.idInstance, credentials?.apiTokenInstance]);

  return { connection, lastError };
}

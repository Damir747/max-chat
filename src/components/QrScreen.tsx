import { useEffect, useRef, useState } from 'react';
import { getQr, getStateInstance } from '../api/greenApi';
import type { Credentials, InstanceState } from '../types';

interface Props {
  credentials: Credentials;
  initialState: InstanceState;
  onAuthorized: () => void;
  onCancel: () => void;
}

const QR_INTERVAL = 6000;
const STATE_INTERVAL = 4000;

const STATE_TEXT: Record<string, string> = {
  notAuthorized: 'Инстанс не авторизован',
  starting: 'Инстанс запускается',
  sleepMode: 'Телефон не в сети',
  blocked: 'Инстанс заблокирован',
  yellowCard: 'Инстанс временно ограничен',
  authorized: 'Инстанс авторизован',
};

/**
 * Показывает QR-код инстанса и ждёт, пока GetStateInstance вернёт authorized.
 * QR обновляется примерно раз в 20 секунд, поэтому опрашиваем его чаще.
 */
export default function QrScreen({ credentials, initialState, onAuthorized, onCancel }: Props) {
  const [qr, setQr] = useState<string | null>(null);
  const [state, setState] = useState<InstanceState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const authorizedRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    let qrTimer: number | undefined;
    let stateTimer: number | undefined;

    async function pollQr() {
      try {
        const response = await getQr(credentials, controller.signal);

        if (response?.type === 'qrCode') {
          setQr(response.message);
          setError(null);
        } else if (response?.type === 'alreadyLogged') {
          finish();
          return;
        } else if (response?.type === 'error') {
          setError(response.message);
        }
      } catch (qrError) {
        if ((qrError as Error).name !== 'AbortError') setError((qrError as Error).message);
      }

      if (!authorizedRef.current) qrTimer = window.setTimeout(pollQr, QR_INTERVAL);
    }

    async function pollState() {
      try {
        const response = await getStateInstance(credentials, controller.signal);
        setState(response.stateInstance);

        if (response.stateInstance === 'authorized') {
          finish();
          return;
        }
      } catch (stateError) {
        if ((stateError as Error).name !== 'AbortError') setError((stateError as Error).message);
      }

      if (!authorizedRef.current) stateTimer = window.setTimeout(pollState, STATE_INTERVAL);
    }

    function finish() {
      if (authorizedRef.current) return;
      authorizedRef.current = true;
      onAuthorized();
    }

    void pollQr();
    void pollState();

    return () => {
      authorizedRef.current = true;
      controller.abort();
      window.clearTimeout(qrTimer);
      window.clearTimeout(stateTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials.idInstance, credentials.apiTokenInstance, credentials.apiUrl]);

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__logo" aria-hidden="true">
          MAX
        </div>
        <h1 className="login__title">Подключите телефон</h1>
        <p className="login__subtitle">
          Откройте MAX на телефоне → «Настройки» → «Устройства» → «Подключить устройство» и
          отсканируйте код. Как только инстанс авторизуется, чат откроется сам.
        </p>

        <div className="qr">
          {qr ? (
            <img className="qr__image" src={`data:image/png;base64,${qr}`} alt="QR-код для входа" />
          ) : (
            <div className="qr__placeholder">Получаем код…</div>
          )}
        </div>

        <p className="qr__state">
          <span className={`dot dot--${state === 'authorized' ? 'listening' : 'idle'}`} />
          {STATE_TEXT[state] || state}
        </p>

        {error && <p className="login__error">{error}</p>}

        <button type="button" className="button button--ghost qr__cancel" onClick={onCancel}>
          Ввести другие учётные данные
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { FormEvent } from 'react';
import { DEFAULT_API_URL, getStateInstance } from '../api/greenApi';
import { ensureNotifications } from '../api/instance';
import QrScreen from './QrScreen';
import type { Credentials, InstanceState } from '../types';

interface Props {
  onLogin: (credentials: Credentials) => void;
}

interface PendingAuth {
  credentials: Credentials;
  state: InstanceState;
}

export default function LoginScreen({ onLogin }: Props) {
  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setApiTokenInstance] = useState('');
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAuth | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    const credentials: Credentials = {
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
      apiUrl: apiUrl.trim() || DEFAULT_API_URL,
    };

    if (!credentials.idInstance || !credentials.apiTokenInstance) {
      setError('Заполните idInstance и apiTokenInstance.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      setStep('Проверяем инстанс');
      const { stateInstance } = await getStateInstance(credentials);

      if (stateInstance === 'blocked') {
        setError('Инстанс заблокирован. Обратитесь в поддержку GREEN-API.');
        return;
      }

      if (stateInstance !== 'authorized') {
        // Инстанс не подключён к MAX — показываем QR-код.
        setPending({ credentials, state: stateInstance });
        return;
      }

      setStep('Включаем приём сообщений');
      await ensureNotifications(credentials);
      onLogin(credentials);
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setBusy(false);
      setStep('');
    }
  }

  async function handleAuthorized() {
    if (!pending) return;
    await ensureNotifications(pending.credentials).catch(() => undefined);
    onLogin(pending.credentials);
  }

  if (pending) {
    return (
      <QrScreen
        credentials={pending.credentials}
        initialState={pending.state}
        onAuthorized={handleAuthorized}
        onCancel={() => setPending(null)}
      />
    );
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={handleSubmit}>
        <div className="login__logo" aria-hidden="true">
          MAX
        </div>
        <h1 className="login__title">Вход в чат</h1>
        <p className="login__subtitle">
          Введите данные инстанса из личного кабинета GREEN-API. Они останутся в этом браузере и
          никуда больше не передаются.
        </p>

        <label className="field">
          <span className="field__label">idInstance</span>
          <input
            className="field__input"
            value={idInstance}
            onChange={(event) => setIdInstance(event.target.value)}
            placeholder="1101000001"
            inputMode="numeric"
            autoComplete="off"
            disabled={busy}
          />
        </label>

        <label className="field">
          <span className="field__label">apiTokenInstance</span>
          <input
            className="field__input"
            value={apiTokenInstance}
            onChange={(event) => setApiTokenInstance(event.target.value)}
            placeholder="d75b3a66374942c5b3c019c698abc2067e151558acbd412345"
            autoComplete="off"
            disabled={busy}
          />
        </label>

        {advanced ? (
          <label className="field">
            <span className="field__label">apiUrl</span>
            <input
              className="field__input"
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              placeholder={DEFAULT_API_URL}
              autoComplete="off"
              disabled={busy}
            />
          </label>
        ) : (
          <button type="button" className="login__link" onClick={() => setAdvanced(true)}>
            Указать другой адрес API
          </button>
        )}

        {error && <p className="login__error">{error}</p>}

        <button type="submit" className="button button--primary login__submit" disabled={busy}>
          {busy ? `${step}…` : 'Войти'}
        </button>

        <p className="login__hint">
          При входе приложение включает уведомления через HTTP API: очищает webhookUrl и
          подписывается на входящие и исходящие сообщения. Если инстанс ещё не подключён к MAX,
          откроется экран с QR-кодом.
        </p>
      </form>
    </div>
  );
}

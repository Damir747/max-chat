export interface Credentials {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
}

export type MessageDirection = 'in' | 'out';

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ChatMessage {
  id: string;
  chatId: string;
  text: string;
  direction: MessageDirection;
  timestamp: number;
  status?: MessageStatus;
  senderName?: string | null;
}

export interface Chat {
  id: string;
  name: string | null;
  unread: number;
}

export interface History {
  chats: Chat[];
  messages: Record<string, ChatMessage[]>;
}

/* ------------------------------ ответы GREEN-API ----------------------------- */

export type InstanceState =
  | 'authorized'
  | 'notAuthorized'
  | 'blocked'
  | 'sleepMode'
  | 'starting'
  | 'yellowCard';

export interface StateInstanceResponse {
  stateInstance: InstanceState;
}

export interface InstanceSettings {
  webhookUrl?: string;
  incomingWebhook?: 'yes' | 'no';
  outgoingWebhook?: 'yes' | 'no';
  outgoingAPIMessageWebhook?: 'yes' | 'no';
  stateWebhook?: 'yes' | 'no';
  [key: string]: unknown;
}

export interface SendMessageResponse {
  idMessage: string;
}

export interface CheckAccountResponse {
  existsWhatsapp?: boolean;
  existsMax?: boolean;
  chatId?: string;
}

/* ------------------------------- уведомления -------------------------------- */

export interface SenderData {
  chatId: string;
  sender?: string;
  chatName?: string;
  senderName?: string;
}

export interface MessageData {
  typeMessage: string;
  textMessageData?: { textMessage?: string };
  extendedTextMessageData?: { text?: string };
  [key: string]: unknown;
}

export type WebhookType =
  | 'incomingMessageReceived'
  | 'outgoingMessageReceived'
  | 'outgoingAPIMessageReceived'
  | 'outgoingMessageStatus'
  | 'stateInstanceChanged'
  | (string & {});

export interface NotificationBody {
  typeWebhook: WebhookType;
  idMessage?: string;
  timestamp?: number;
  senderData?: SenderData;
  messageData?: MessageData;
  /** только для outgoingMessageStatus */
  chatId?: string;
  status?: MessageStatus;
  stateInstance?: InstanceState;
}

export interface Notification {
  receiptId: number;
  body: NotificationBody;
}

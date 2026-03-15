import type { NotificationType } from '../constants/index.js';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string | null;
  relatedMenuId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PollResponse {
  notifications: Notification[];
  unreadCount: number;
  serverTime: string;
}

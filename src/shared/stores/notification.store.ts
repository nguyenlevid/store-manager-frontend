/**
 * Notification Store
 *
 * Global notification system with support for:
 * - Multiple notification types (success, error, warning, info)
 * - Auto-dismiss with configurable duration
 * - Manual dismissal
 * - Queue management
 * - Unique IDs for tracking
 */

import { createSignal } from 'solid-js';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number; // milliseconds, 0 = no auto-dismiss
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface NotificationOptions {
  type?: NotificationType;
  title?: string;
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Default durations (ms)
const DURATIONS = {
  success: 4000,
  error: 6000,
  warning: 5000,
  info: 4000,
} as const;

// Notification queue
const [notifications, setNotifications] = createSignal<Notification[]>([]);

// Auto-increment ID
let notificationIdCounter = 0;

/**
 * Generate unique notification ID
 */
function generateId(): string {
  return `notification-${Date.now()}-${++notificationIdCounter}`;
}

/**
 * Add a notification to the queue
 */
function addNotification(
  message: string,
  options: NotificationOptions = {}
): string {
  const type = options.type || 'info';
  const id = generateId();

  const notification: Notification = {
    id,
    type,
    title: options.title,
    message,
    duration: options.duration ?? DURATIONS[type],
    dismissible: options.dismissible ?? true,
    action: options.action,
  };

  setNotifications((prev) => [...prev, notification]);

  // Auto-dismiss if duration > 0
  if (notification.duration && notification.duration > 0) {
    setTimeout(() => {
      removeNotification(id);
    }, notification.duration);
  }

  return id;
}

/**
 * Remove a notification by ID
 */
function removeNotification(id: string): void {
  setNotifications((prev) => prev.filter((n) => n.id !== id));
}

/**
 * Clear all notifications
 */
function clearAllNotifications(): void {
  setNotifications([]);
}

/**
 * Show success notification
 */
function notifySuccess(
  message: string,
  options?: Omit<NotificationOptions, 'type'>
): string {
  return addNotification(message, { ...options, type: 'success' });
}

/**
 * Show error notification
 */
function notifyError(
  message: string,
  options?: Omit<NotificationOptions, 'type'>
): string {
  return addNotification(message, { ...options, type: 'error' });
}

/**
 * Show warning notification
 */
function notifyWarning(
  message: string,
  options?: Omit<NotificationOptions, 'type'>
): string {
  return addNotification(message, { ...options, type: 'warning' });
}

/**
 * Show info notification
 */
function notifyInfo(
  message: string,
  options?: Omit<NotificationOptions, 'type'>
): string {
  return addNotification(message, { ...options, type: 'info' });
}

export const notificationStore = {
  // State
  notifications,

  // Actions
  notify: addNotification,
  success: notifySuccess,
  error: notifyError,
  warning: notifyWarning,
  info: notifyInfo,
  remove: removeNotification,
  clearAll: clearAllNotifications,
};

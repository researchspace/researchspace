/*
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

import * as React from 'react';
import * as ReactNotificationSystem from 'react-notification-system';

const NOTIFICATIAN_SYSTEM_REF = 'notificationSystem';
let _system: ReactNotificationSystem.System;

export function renderNotificationSystem() {
  return React.createElement(
    ReactNotificationSystem, {
      key: NOTIFICATIAN_SYSTEM_REF,
      ref: NOTIFICATIAN_SYSTEM_REF,
      allowHTML: true,
      style: {
        NotificationItem: {
          DefaultStyle: {
            padding: '20px',
            fontSize: '14px',
          },
        },
      }}
  );
}

export function registerNotificationSystem(_this: React.Component<any, any>) {
  _system = _this.refs[NOTIFICATIAN_SYSTEM_REF] as ReactNotificationSystem.System;
}

export function addNotification(
  notification: ReactNotificationSystem.Notification, exception?: any
): ReactNotificationSystem.Notification {
  if (exception) {
    console.error(exception);
  }
  return _system.addNotification(notification);
}

export function removeNotification(uidOrNotification: number | string | Notification): void {
  _system.removeNotification(uidOrNotification);
}

export function clearNotifications() {
  _system.clearNotifications();
}

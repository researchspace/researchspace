/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as React from 'react';
import * as ReactNotificationSystem from 'react-notification-system';

const NOTIFICATIAN_SYSTEM_REF = 'notificationSystem';
let _system: ReactNotificationSystem.System;

export function renderNotificationSystem() {
  return React.createElement(ReactNotificationSystem, {
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
    },
  });
}

export function registerNotificationSystem(_this: React.Component<any, any>) {
  _system = _this.refs[NOTIFICATIAN_SYSTEM_REF] as ReactNotificationSystem.System;
}

export function addNotification(
  notification: ReactNotificationSystem.Notification,
  exception?: any
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

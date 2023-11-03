import React from 'react';
import ReactDOM from 'react-dom/client';
import { createPortal } from 'react-dom';

export const NotificationsService = {
  
  addNotification: ((...args) => use_action.sxmp_notification_add(...args)) as typeof use_action.sxmp_notification_add,
  removeNotification: ((...args) => use_action.sxmp_notification_remove(...args)) as typeof use_action.sxmp_notification_remove,

}

import './styles.css'
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { createPortal } from 'react-dom';
import { filterHooks, login_mount, logout } from './startup/mounts';
import { modalServiceHooks } from './services/modal-service/modal-hooks';
import { routerServiceHooks, routerServiceReactHooks } from './services/router/router-hooks';
import { snackbarServiceHooks } from './services/snackbars/snackbar-hooks';
import { uiServiceHooks } from './services/ui/ui-hooks';
import { loadingServiceHooks } from './services/loading-overlay/loading-hooks';
import { notificationServiceHooks } from './services/notifications/notification-hooks';

frontendConnector({
  react: { React, ReactDOM, createPortal },
  hooks: {
    actions: [
      modalServiceHooks,
      routerServiceHooks,
      snackbarServiceHooks,
      uiServiceHooks,
      loadingServiceHooks,
      notificationServiceHooks,
      { sxmp_logout: () => logout() },
    ],
    filters: [
      filterHooks,
    ],
    react: [
      routerServiceReactHooks,
      { stlse_root_mount_point: () => login_mount },
    ],
  },
});

document.querySelectorAll('title').forEach(n => n.remove());
document.head.innerHTML += `<title>Login</title>`;
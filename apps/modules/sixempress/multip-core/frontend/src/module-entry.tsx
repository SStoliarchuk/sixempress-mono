import './styles.css';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { createPortal } from 'react-dom';
import { frontendConnector } from '@stlse/frontend-connector';
import { CodeScannerService, ConfirmModalComponent, ControllersService, DataStorageService, GlobalErrorHandler, LoadingOverlay, SocketDbUpdateEmitter, UiErrorService, UiTransferContext, W, wrapped } from '@sixempress/main-fe-lib';
import { mainConfig } from './sx-main';
import { upgradeHtml } from './upgrade-html';
import * as _ from 'apps/modules/sixempress/theme/frontend/src/types/hooks.d';
import { getAppRoutes, getRoutes } from './routes';
import { userroleHooks } from './base-components/user-roles/multip-user-role.controller';
import { SocketService } from '@sixempress/main-fe-lib';
import { openReceiptModal } from './exports';
import QrCodeIcon from '@material-ui/icons/CenterFocusWeak';
import { CameraScannerDialog } from './base-components/camera-scanner/camera-scanner.dialog';
import { SystemSettings } from './base-components/system-settings/system-settings';
import { ProductController } from './components/multi-purpose/products/product.controller';
import { listenAndUpdateOnConfigChange, openOnConfigChange } from './utils/update-on-config';

frontendConnector({
  react: { React, ReactDOM, createPortal },
  hooks: {
    filters: [
      userroleHooks,
      ProductController.filterHooks,
      GlobalErrorHandler.filterHooks,
      {
        stlse_on_instance_refresh: (ctx, ret) => {
          openOnConfigChange();
          return false;
        },
        sxmp_theme_ui_menu_action_buttons: (ctx, ret) => {
          return [{icon: <W ruhProps={{style: {display: 'flex'}}}><QrCodeIcon/></W>, title: 'Code Scanner', onClick: () => CameraScannerDialog.toggle()}, ...ret]
        },
        sxmp_theme_app_routes: (ctx, ret) => {
          return [
            ...ret,
            ...getAppRoutes(),
            {path: 'system-settings', component: wrapped(SystemSettings)},
          ]
        },
        sxmp_theme_sidebar: (ctx, ret) => {
          return [
            ...ret,
            ...getRoutes(),
          ];
        },
        // default to core
        sxmp_override_request_service_destination_module: async (ctx, ret, module, endpoint, req) => {
          return (await ret) || (await use_action.stlse_module_name() as string);
        },
        // sxmp_theme_app_routes: (ctx, ret) => {
        //   return [{react: reactInfo, routes: [
        //     {path: 'helloworld', component: HelloWorld}
        //   ]}, ...ret];
        // },
        // sxmp_theme_sidebar: (ctx, ret) => {
        //   return [{react: reactInfo, routes: [{type: 'route', data: {label: 'Hello', routeLink: 'helloworld'}}]}, ...ret];
        // },
      }
    ],
    react: [{
      // execute before others so that it can be replaced
      sxmp_main_wrapper_topbar_center_content: {
        priority: 9,
        fn: () => () => "SIXEMPRESS",
      },
      sxmp_theme_root_components: () => () => (
        <W>
          <CameraScannerDialog/>
          <UiErrorService/>
        </W>
      ),
    }],
    actions: [
      ProductController.actionHooks,
      {
        stlse_auth_overridden_by_secondary_window: (ctx, ret) => {
          // we use alert to stop the execution of the code
          alert('Conflitto sessione\nLa sessione attuale e\' stata invalidata da una seconda pagina aperta.\nLa pagina sara\' riavviata');
          // on reload we will get the correct tokens
          window.location.reload();
          // dont show default alert
          return false;
        },
        sxmp_login_successful: async (ctx, ret) => {
          await mainConfig.onLogin();
        },
        sxmp_openReceiptModal: (ctx, ret, ...args) => openReceiptModal(...args),

        sxmp_socket_is_active: () => SocketService.isActive,
        sxmp_socket_on: (ctx, ret, ...args) => SocketService.on(...args),
        sxmp_socket_off: (ctx, ret, ...args) => SocketService.off(...args),

        sxmp_localStorage: () => DataStorageService.localStorage,
        sxmp_sessionStorage: () => DataStorageService.sessionStorage,
      }
    ],
  },
});

(() => {
  upgradeHtml();
  // ContextService.setupContext(mainConfig.environment);
  listenAndUpdateOnConfigChange();
  ControllersService.initialize(mainConfig.controllers || []);
  CodeScannerService.start();
  SocketDbUpdateEmitter.setupDatatableSocketUpdates();
  GlobalErrorHandler.start();
})();
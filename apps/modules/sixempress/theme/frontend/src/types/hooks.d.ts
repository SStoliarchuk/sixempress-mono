import React, { Component } from 'react';
import { ConnectorConfiguration, ConnectorPayload, ConnectorReturn, ReactInfo } from '@stlse/frontend-connector';
import { RouteComponentProps, RouteDeclaration } from '../services/router/router.dtd';
import { ModalService } from '../services/modal-service/modal.service';
import { Theme } from '@material-ui/core';
import { RouterService } from '../services/router/router-service';
import { SnackbarService } from '../services/snackbars/snackbar.service';
import { IAvailableRoute } from '../components/main-wrapper/main-wrapper.dtd';
import { LPState } from '../components/login/login-page';
import { NotificationsService } from '../services/notifications/notifications.service';
import { ActionEmitter } from '@stlse/utilities-agnostic';
import { LibNotification } from '../services/notifications/notifications.dtd';

export type ReactAdd = {react: ReactInfo, wrap?: React.ElementType};
export type UiMenuActionButton = {icon: any, onClick: React.MouseEventHandler<HTMLButtonElement>, title: string};

declare global {
  interface filters {
    sxmp_theme_sidebar: (routes: IAvailableRoute[]) => IAvailableRoute[],
    sxmp_theme_app_routes: (routes: RouteDeclaration[]) => RouteDeclaration[],
    sxmp_theme_ui_menu_action_buttons: (routes: UiMenuActionButton[]) => UiMenuActionButton[],
    sxmp_mui_v4_theme_overrides: (theme: {dark?: Partial<Theme>, light?: Partial<Theme>}) => {dark?: Partial<Theme>, light?: Partial<Theme>},
  }
  interface actions {
    sxmp_login_successful: () => void | Promise<void>,
    sxmp_logout: () => void,
    sxmp_on_logout: () => void,
    
    // modal
    sxmp_modal_open: <C extends ComponentType<any>>(react: ReactAdd, ...args: Parameters<typeof ModalService['open']>) => OpenModalControls<C>,
    sxmp_modal_close_all: (data?: any) => void,

    // loading
    sxmp_loading_get_status: () => boolean,
    sxmp_loading_set_status: (s: boolean) => void,
    sxmp_loading_clear_all: () => void,

    // router
    sxmp_router_get_current_path: () => string,
    sxmp_router_goto: (path: string | {}, replace?: boolean, timeout?: boolean) => void,
    sxmp_router_back: () => void,
    sxmp_router_match(props: RouteComponentProps): {[key: string]: string},
    sxmp_router_reload_page: () => void,
    
    // snackbar
    sxmp_snackbar_open: (react: ReactAdd, ...args: Parameters<typeof SnackbarService['openSimpleSnack']>) => ReturnType<Parameters<typeof SnackbarService['openSimpleSnack']>>,
    sxmp_snackbar_open_complex: (react: ReactAdd, ...args: Parameters<typeof SnackbarService['openComplexSnack']>) => ReturnType<Parameters<typeof SnackbarService['openComplexSnack']>>,

    // notifications
    // type LibNotification = {title: string, content?: string, dismissable?: boolean, onClick?: () => void, onRemoved?: () => void}
    sxmp_notification_add: (notification: LibNotification) => void,
    sxmp_notification_remove: (id: string) => void,

    // ui
    sxmp_ui_get_active_theme_mui_v4: () => Theme,
    sxmp_ui_set_active_theme_palette: (palette: 'dark' | 'light') => void,
    sxmp_ui_get_theme_changes_emitter: () => ActionEmitter<['dark' | 'light']>,
  }
  interface react_hooks {
    sxmp_settings_page_modal_buttons: (p: {}) => any,
    sxmp_business_locations_editor_modal_button: (p: {}) => any,
    sxmp_theme_root_components: (p: {}) => any,
    sxmp_main_wrapper_topbar_center_content: (p: {}) => any,

    // router
    sxmp_router_outlet: (p: {props: RouteComponentProps}) => any,
  }
}

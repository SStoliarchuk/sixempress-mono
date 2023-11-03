import React from 'react';
import { Paper } from "@material-ui/core";
import { ConnectorConfiguration } from "@stlse/frontend-connector";
import { BusinessLocationsService, ConfirmModalComponent, DataStorageService, UiSettings } from '@sixempress/main-fe-lib';
import { AuthService } from '@sixempress/abac-frontend';
import { SocketService } from '@sixempress/main-fe-lib';
import { openReceiptModal } from './exports';
import { AttributeLabel } from './utils/enums/attributes';
import * as _ from 'apps/modules/sixempress/labac/frontend/src/types/hooks.d';

// labac

export const hooks: ConnectorConfiguration['hooks'] = {
  react: [{
    // paper: () => p => <Paper className='def-box' {...p}>{p.children}</Paper>,
  }],
  actions: [{
    // sxmp_labac_on_auth_response: (ctx, ret, b) => BusinessLocationsService.updateByBusiness(b),
    sxmp_openReceiptModal: (ctx, ret, ...args) =>  openReceiptModal(...args),

    sxmp_socket_is_active: () => SocketService.isActive,
    sxmp_socket_on: (ctx, ret, ...args) => SocketService.on(...args),
    sxmp_socket_off: (ctx, ret, ...args) => SocketService.off(...args),

    sxmp_localStorage: () => DataStorageService.localStorage,
    sxmp_sessionStorage: () => DataStorageService.sessionStorage,
  }],
}
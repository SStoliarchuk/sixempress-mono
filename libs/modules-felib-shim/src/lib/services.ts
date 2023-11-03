import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { createPortal } from 'react-dom';
import { SnackbarVariant } from '@sixempress/theme';
import { 
  ArgumentTypes,
  BusinessLocationsService as _BusinessLocationsService,
  DataStorageService as _DataStorageService,
  UiSettings as _UiSettings,
  SmallUtils as _SmallUtils,
  RouterService as _RouterService,
  ConfirmModalComponent as _ConfirmModalComponent,
  // UiThemeProvider,
  UiTransferContext,
  ModalService as _ModalService
} from '@sixempress/main-fe-lib';


export const SmallUtils = {
  ..._SmallUtils,
  notify: (msg: string, variant: SnackbarVariant) => use_action.sxmp_snackbar_open({react: {React, ReactDOM, createPortal}}, msg, {variant}),
}



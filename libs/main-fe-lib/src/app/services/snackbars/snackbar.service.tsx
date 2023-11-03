import React from 'react';
import ReactDOM from 'react-dom/client';
import { createPortal } from 'react-dom';
import { UiTransferContext } from '../ui/ui-components';

type OmitFirstArg<F extends (...args: any) => any> = Parameters<F> extends [any, ...infer B] ? ((...args: B) => ReturnType<F>) : never;

export const SnackbarService = {

	openSimpleSnack: ((...args) => use_action.sxmp_snackbar_open({react: {React, ReactDOM, createPortal}, wrap: UiTransferContext}, ...args)) as 
    OmitFirstArg<typeof use_action.sxmp_snackbar_open>,

  openComplexSnack: ((...args) => use_action.sxmp_snackbar_open_complex({react: {React, ReactDOM, createPortal}, wrap: UiTransferContext}, ...args)) as 
    OmitFirstArg<typeof use_action.sxmp_snackbar_open_complex>,

}

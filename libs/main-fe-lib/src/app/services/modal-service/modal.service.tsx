import React from 'react';
import ReactDOM from 'react-dom/client';
import { createPortal } from 'react-dom';
import { UiTransferContext } from '../ui/ui-components';

type OmitFirstArg<F extends <A>(...args: any) => any> = Parameters<F> extends [any, ...infer B] 
	? F extends (<A>(...args: any) => any) 
		? <A>(...args: B) => ReturnType<F>
		: never
	: never;

export const ModalService = {

	open: ((...args) => use_action.sxmp_modal_open({react: {React, ReactDOM, createPortal}, wrap: UiTransferContext}, ...args)) as 
		OmitFirstArg<typeof use_action.sxmp_modal_open>,

	closeAll: () => use_action.sxmp_modal_close_all(),
}


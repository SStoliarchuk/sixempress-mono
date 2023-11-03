import { UiTransferContext } from '@sixempress/main-fe-lib';
import { RUHProp, ReactInfo, getReactWrapper } from '@stlse/frontend-connector';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { createPortal } from 'react-dom';

const reactInfo: ReactInfo = { React, ReactDOM, createPortal };
const { ReactWrap } = getReactWrapper(reactInfo);

export function W(p: {children: any} & Pick<RUHProp<any, any>, 'ruhProps' | 'ruhTag' | 'ruhNoArray'>) {
  const { children, ...others } = p;
  return <ReactWrap {...others}><UiContextWrap>{children}</UiContextWrap></ReactWrap>;
}

export const wrapped = (Component: any) => {
  return function ReactHookWrapped(props: any) {
    return <W><Component {...props}/></W>;
  }
}

function UiContextWrap(p: {children: any}) {
  return (
    <UiTransferContext>
      {p.children}
    </UiTransferContext>
  );
};


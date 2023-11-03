import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { createPortal } from 'react-dom';
import { frontendConnector } from '@stlse/frontend-connector';

frontendConnector({
  react: { React, ReactDOM, createPortal },
  hooks: {
  },
});

function react_test(p: { v: number; children: any }) {
  const [v, setV] = React.useState(0);

  return (
    <>
      <h1>Module: sixempress__external_sync</h1>
      <ul>
        <li>v from props: {p.v}</li>
        <li>v from state: {v}</li>
      </ul>
      <button onClick={() => setV(v + 1)}>increase state v</button>

      <div>Children:</div>
      <div>{p.children}</div>
    </>
  );
}

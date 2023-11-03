import './styles.css';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { createPortal } from 'react-dom';
import { frontendConnector } from '@stlse/frontend-connector';

frontendConnector({
  react: { React, ReactDOM, createPortal },
  hooks: {
    filters: [
      {
        filters_test: (ctx, ret, nn) => {
          return ret + 1;
        },
      },
    ],
    actions: [
      {
        actions_test: (ctx, ret, nn) => {
          alert('actions_test: ' + nn);
          return ret;
        },
      },
    ],
    react: [
      {
        stlse_react_hooks_test: (ctx, ret) => HelloWorld,
      },
    ],
  },
});

function HelloWorld(p: {}) {
  const [apiVal, setApiVal] = React.useState<string>('');
  const [filterVal, setFilterVal] = React.useState<null | number>(null);

  const onClickApi = () => {
    use_action
      .stlse_request('GET', '/api_test')
      .then((response) => setApiVal(JSON.stringify(response.data)))
      .catch((error) => setApiVal(JSON.stringify(error)));
  };

  const onClickFilter = () => {
    const val = use_filter.filters_test(1);
    setFilterVal(val);
  };

  const onClickAction = () => {
    use_action.actions_test(1);
  };

  return (
    <>
      <h1>Hello from Module: sixempress__raw_files</h1>

      <br />
      <hr />
      <button onClick={onClickApi}>Test API call</button>
      {apiVal && (
        <>
          <h2>Api response</h2>
          <div>{apiVal}</div>
        </>
      )}

      <br />
      <hr />
      <button onClick={onClickFilter}>Test Filter hook</button>
      {filterVal !== null && (
        <>
          <h2>Test Filter response</h2>
          <div>{filterVal}</div>
        </>
      )}

      <br />
      <hr />
      <button onClick={onClickAction}>Test Action hook</button>
    </>
  );
}

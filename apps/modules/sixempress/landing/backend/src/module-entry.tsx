// TODO add this to template ?
import 'core-js/features/url';
import 'core-js/features/url-search-params';
import React from 'react';
import express from 'express';
import * as ReactDOMServer from 'react-dom/server';
import { Routes } from 'react-router-dom';
import { StaticRouter } from 'react-router-dom/server';
import { generateReactPages } from './pages';
import { backendConnector, devServeStatic } from '@stlse/backend-connector';
import { SSRUtilities, onRequest_Express } from '@stlse/backend-connector';
import { environment } from './environments/environment';
import indexHtmlTemplate from '@stlse/modules-nx/plugins/ssr/index.html.template';

const app = express();

const connector = backendConnector({
  localServer: { secret: environment.local, port: 3100 },
  remoteServer: { secret: environment.remote },
  onRequest: onRequest_Express(app),
});

// if the connector is a Promise we are hosting externally or in development
// so we serve manually the static files and open an additional express port
if (connector instanceof Promise) {
  const dist = process.cwd() + '/dist/apps/modules/sixempress/landing/browser';
  app.get('*', devServeStatic(dist));

  connector.then((control) => {
    const server = app.listen(3000);
    process.on('SIGTERM', () => (server.close(), control.forceStop()));
  });
}

// generate ssr pages
app.all('*', (req: express.Request, res: express.Response) => {
  const rendered = ReactDOMServer.renderToString(
    <StaticRouter location={req.originalUrl}>
      <Routes>{generateReactPages()}</Routes>
    </StaticRouter>
  );

  // merge scripts/links with the base index html
  const processed = SSRUtilities.prepareSsrReturn(rendered, indexHtmlTemplate);
  return res.send(processed);
});

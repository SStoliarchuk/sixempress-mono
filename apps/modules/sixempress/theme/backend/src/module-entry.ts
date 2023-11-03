import express from 'express';
import { backendConnector } from '@stlse/backend-connector';
import { onRequest_Express } from '@stlse/backend-connector';

const app = express();

backendConnector({
  localServer: {
    port: 2813, 
    secret: 'asdasdasd'
  },
  remoteServer: {
    secret: '',
  },
  hooks: {
  },
  onRequest: onRequest_Express(app),
});

app.get('/api_test', (req, res) => {
  res.status(202).send({ api_test_ok: true, module_name: 'sixempress__theme' });
});

import express from 'express';
import { onRequest_Express, backendConnector, ErrorHandlerService } from '@stlse/backend-connector';
import { middlewareAdapter } from '@stlse/backend-connector';
import { EnvKeys, RequestHelperService, transformExpressApp } from '@sixempress/main-be-lib';
import fs from 'fs';
import { RawFilesService } from './external-sync/raw-files.service';
import https from 'https';
import cors from 'cors';
import { registerControllers } from '@sixempress/be-multi-purpose';
import chokidar from 'chokidar';

// const certspath = '/tmp/rmm';
// const secret = JSON.parse(fs.readFileSync(__dirname + '/../../../../../../apps/modules/sixempress/external-sync/backend/env/prod.secret.key.json', 'utf-8'));

const certspath = '/certs/live_mount/cert_0';
const secret = JSON.parse(fs.readFileSync('/code/env/prod.secret.key.json', 'utf-8'));
// const secret = JSON.parse(fs.readFileSync('/code/env/dev.secret.key.json', 'utf-8'));
// const secret = JSON.parse(fs.readFileSync('/code/env/stlse.secret.key.json', 'utf-8'));

(async () => {

  ErrorHandlerService.addUnhandledCatches();
  const app = express();

  const bkndServer = backendConnector({
    localServer: { secret: secret.local },
    remoteServer: { secret: secret.remote, address: secret.address, tunnel: secret.tunnel },
    onRequest: onRequest_Express(app),
  });

  registerControllers();

  // we need cors as the requests to raw files upload is done directly to the server
  app.use(cors());
  // option requests do not have auth header so we let them pass before the auth middleware
  app.options('*', (req, res) => res.sendStatus(200));

  // as we expose this serve to the public we have to be sure it is always authenticated
  const middleware = middlewareAdapter({authentication: (req) => req.header('authorization')});
  app.use((req, res, next) => middleware(req, res, (err) => err ? res.status(401).send(err) : next()));


  app.get('/api_test', (req, res) => {
    res.status(202).send({ api_test_ok: true, module_name: 'sixempress__external_sync' });
  });

  const custom = transformExpressApp(app);
  RawFilesService.start(custom, secret.baseUri);

  // we have to run https for public
  const certificate = fs.readFileSync(certspath + '/fullchain.pem', 'utf8');
  const privateKey  = fs.readFileSync(certspath + '/privkey.pem', 'utf8');
  const credentials = {key: privateKey, cert: certificate};

  const httpsServer = https.createServer(credentials, app);
  httpsServer.listen(13030, () => console.log('Listening on 13030'));

  // graceful shutdown
  const control = await bkndServer;
  const shutdown = async () => {
    console.log('shutting down')
    await Promise.all([
      new Promise<void>((r, j) => httpsServer.close(err => err ? j(err) : r())),
      new Promise<void>((r, j) => control.stop((err => err ? j(err) : r()) as any)),
    ]);
  }
  process.on('beforeExit', shutdown);
  process.on('exit', shutdown);
  process.on('SIGTERM', shutdown);

  // if https certificate changes, then restart
  const restart = () => shutdown().finally(() => process.exit(255));
  chokidar.watch(certspath, {persistent: true, awaitWriteFinish: true, ignoreInitial: true})
    .on('add', restart)
    .on('change', restart)
    .on('unlink', restart)
    .on('error', restart)
    ;

})();

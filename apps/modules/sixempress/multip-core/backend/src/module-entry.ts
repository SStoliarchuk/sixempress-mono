import {  BusinessCategory, CS, CrudCollection, EnvKeys, AbstractDbApiItemController, RequestHandlerService, RequestHelperService } from '@sixempress/main-be-lib';
import { generateDatereportPaths } from './app/paths/datareport/datareport';
import { MultipConfigService } from './app/services/multip-config/multip-config.service';
import { registerControllers } from './exports';
import express from 'express';
import { backendConnector, ExpressAdapter, middlewareAdapter } from '@stlse/backend-connector';
import { onRequest_Express } from '@stlse/backend-connector';
import { } from '@sixempress/abac-backend';
import { ExternalConnPathsService } from './app/services/multip-config/external-conn-paths.service';
import { WebRTCService } from './app/services/webrtc/webrtc.service';
import { environment as config } from './environments/environment';

const dbItems = registerControllers();
const app = express();

const v = backendConnector({
  localServer: { secret: config.local, port: 21911 },
  remoteServer: { secret: config.remote, address: config.address, tunnel: config.tunnel },
  onRequest: onRequest_Express(app),
  hooks: {
    filters: [{
      sxmp_labac_pepper_seed: () => config.pepper,
    }],
    actions: [
      WebRTCService.actionHooks(),
      CrudCollection.actions,
    ]
  },
});




(v && v.then && v.then(i => {
  process.on('SIGTERM', () => i.forceStop());
  process.on('beforeExit', () => i.forceStop());
  process.on('exit', () => i.forceStop());
}));

if (!globalThis.process)
  globalThis.process = {} as any;
if (!globalThis.process.env)
  globalThis.process.env = {} as any;

app.use((req, res, next) => (RequestHelperService.parseQueryStrings(req), next()));

for (const c of dbItems) {
  const controller = new (c as any)() as AbstractDbApiItemController<any>;
  controller.generateBePaths(app, new RequestHandlerService(controller))
}
generateDatereportPaths(app);
MultipConfigService.initAuthPaths(app);
WebRTCService.initService(app);
ExternalConnPathsService.start(app);

import express from 'express';
import { onRequest_Express, backendConnector, ExpressAdapter, ErrorHandlerService } from '@stlse/backend-connector';
import { ExternalSyncService } from './app/external-sync/external-sync.service';
import { EnvKeys, ExceptionController, RequestHelperService, transformExpressApp } from '@sixempress/main-be-lib';
import { registerControllers } from '@sixempress/be-multi-purpose';
import { ExternalSyncUtils } from './app/external-sync/external-sync.utils';
import { environment as secret } from './environments/environment';

const app = express();

const connector = backendConnector({
  localServer: { secret: secret.local },
  remoteServer: { secret: secret.remote, address: secret.address, tunnel: secret.tunnel },
  onRequest: onRequest_Express(app),
  hooks: {
    actions: [{
      sxmp_on_after_db: (ctx, ret, dbOps, add) => {
        for (const info of dbOps)
          ExternalSyncService.handleHookCrudEvent(ctx.req, add.args, info.type, info.modelClass, info.ids);
        return ret;
      },
    }],
    filters: [{
      sxmp_is_website_connected: async (ctx, ret) => {
        const req = ExpressAdapter.createReq(ctx.req, ExpressAdapter.createRes());
        RequestHelperService.parseQueryStrings(req);

        const conf = await ExternalSyncUtils.getExternalConnections(req, false);
        const connected = conf.length && conf.some(c => !c.isDisabled);
        const stock = await ExternalSyncService.anyDiscrepanciesForAllConnection(req);
        
        return {connected, stockIssue: stock};
      }
    }]
  },
});

if (connector instanceof Promise) {
  ErrorHandlerService.addUnhandledCatches();
  connector.then(control => process.on('SIGTERM', () => control.forceStop()));
}

registerControllers();
const custom = transformExpressApp(app);
ExternalSyncService.start(custom);

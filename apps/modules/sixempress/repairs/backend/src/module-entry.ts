import express from 'express';
import { backendConnector, ExpressAdapter } from '@stlse/backend-connector';
import { onRequest_Express } from '@stlse/backend-connector';
import { ControllersService, CS, ModelFetchService, RequestHandlerService, RequestHelperService } from '@sixempress/main-be-lib';
import { RepairController } from './app/repairs/Repair.controller';
import { transformExpressApp } from '@sixempress/main-be-lib';
import { registerControllers } from '@sixempress/be-multi-purpose';
import { ModelClass } from './enums/model-class.enum';
import { RepairSettingsEndpoint } from './app/repairs/repair-settings.endpoint';
import { environment as secret } from './environments/environment';

const app = express();
backendConnector({
  localServer: { secret: secret.local },
  remoteServer: { secret: secret.remote, address: secret.address },
  onRequest: onRequest_Express(app),
  hooks: {
    filters: [{
      sxmp_fetch_fallback_model: async (context, return_value, models, modelClass, params) => {
        if (modelClass !== ModelClass.Repair)
          return return_value;

        const req = ExpressAdapter.createReq(context.req, ExpressAdapter.createRes());
        const controller = new RepairController();
        const toR = await controller.findForUser(req, { _id: { $in: params.ids } }, { base: { projection: params.projection || {} }, skipFilterControl: true });
        if (params.toFetch)
          await ModelFetchService.fetchAndSetFields(req, params.toFetch, toR);

        return toR;
      },
    }]
  }
});

app.use((req, res, next) => {
  RequestHelperService.parseQueryStrings(req);
  next();
});


app.get('/ping', (req, res) => {console.log(CS.db); res.send('hello')});
const transformed = transformExpressApp(app);

registerControllers();
const controller = new RepairController()
ControllersService.registerController(RepairController as any);
controller.generateBePaths(transformed, new RequestHandlerService(controller));

RepairSettingsEndpoint.initAuthPaths(app);

app.get('/api_test', (req, res) => {
  res.status(202).send({ api_test_ok: true, module_name: 'sixempress__repairs' });
});

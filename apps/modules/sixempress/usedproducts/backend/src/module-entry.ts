import express from 'express';
import { backendConnector } from '@stlse/backend-connector';
import { onRequest_Express } from '@stlse/backend-connector';
import { CS, ControllersService, RequestHandlerService, RequestHelperService } from '@sixempress/main-be-lib';
import { UsedProductController } from './app/used-products/UsedProduct.controller';
import { transformExpressApp } from '@sixempress/main-be-lib';
import { registerControllers } from '@sixempress/be-multi-purpose';
import { environment as config } from './environments/environment';

const app = express();
backendConnector({
  localServer: { secret: config.local },
  remoteServer: { secret: config.remote, },
  onRequest: onRequest_Express(app),
});

app.use((req, res, next) => {
  RequestHelperService.parseQueryStrings(req);
  next();
});

app.get('/ping', (req, res) => {console.log(CS.db); res.send('hello')});
const transformed = transformExpressApp(app);

registerControllers();
const controller = new UsedProductController()
ControllersService.registerController(UsedProductController as any);
controller.generateBePaths(transformed, new RequestHandlerService(controller));

app.get('/api_test', (req, res) => {
  res.status(202).send({ api_test_ok: true, module_name: 'sixempress__usedproducts' });
});



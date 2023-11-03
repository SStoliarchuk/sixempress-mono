import express from 'express';
import { backendConnector, ExpressAdapter } from '@stlse/backend-connector';
import { onRequest_Express } from '@stlse/backend-connector';
import { AbstractDbApiItemController, ControllersService, CS, ModelFetchService, RequestHandlerService, RequestHelperService } from '@sixempress/main-be-lib';
import { transformExpressApp } from '@sixempress/main-be-lib';
import { registerControllers } from '@sixempress/be-multi-purpose';
import { ModelClass } from './enums';
import { environment } from './environments/environment';
import { CalendarEventController } from './calendar-events/CalendarEvent.controller';
import { CustomerAppointmentController } from './customer-appointment/CustomerAppointment.controller';

const app = express();
backendConnector({
  localServer: { secret: environment.local, port: environment.port },
  remoteServer: { secret: environment.remote, address: environment.address },
  onRequest: onRequest_Express(app),
  hooks: {
    filters: [{
      sxmp_fetch_fallback_model: async (context, return_value, models, modelClass, params) => {
        let controller: AbstractDbApiItemController<any>;
        switch (modelClass) {
          case ModelClass.CalendarEvent: controller = new CalendarEventController() as any; break;
          case ModelClass.CustomerAppointment: controller = new CustomerAppointmentController() as any; break;
        }

        if (!controller)
          return return_value;

        const req = ExpressAdapter.createReq(context.req, ExpressAdapter.createRes());
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
for (const c of [CalendarEventController, CustomerAppointmentController]) {
  ControllersService.registerController(c as any);
  const controller = new c() as any;
  controller.generateBePaths(transformed, new RequestHandlerService(controller));
}

app.get('/api_test', (req, res) => {
  res.status(202).send({ api_test_ok: true, module_name: 'sixempress__calendar' });
});

import express from 'express';
import { backendConnector, ExpressAdapter } from '@stlse/backend-connector';
import { onRequest_Express } from '@stlse/backend-connector';
import to from 'await-to-js';
import { ApiKeyController } from './app/api-keys/ApiKey.controller';
import { createJwt, getActiveVerifiedUser, maybeCreateFirstUser, maybeSetFirstPassword } from './services/authentication/server-jwt';
import { User } from './app/users/User.dtd';
import { AbstractDbApiItemController, AuthHelperService, ControllersService, ModelFetchService, RequestHandlerService, RequestHelperService } from '@sixempress/main-be-lib';
import { ObjectId } from 'mongodb';
import { UserController } from './app/users/User.controller';
import { UserRoleController } from './app/user-roles/UserRole.controller';
import { BusinessLocationsService } from './services/business-locations/business-locations.service';
import { environment as config } from './environments/environment';
import { ModelClass } from './enums';
import { ApiKey } from './exports';

const app = express();

// user . {roleid} . {userid}
type SubIdUser = `${'user'}.${string}.${string}`
// apikey . {userid}
type SubIdApi  = `${'apikey'}.${string}`;

const v = backendConnector({
  localServer: { secret: config.local, port: 21914 },
  remoteServer: { secret: config.remote, address: config.address, tunnel: config.tunnel },
  onRequest: onRequest_Express(app),
  hooks: {
    filters: [{ 
      stlse_auth_token_data: async (ctx, ret, dataObj, subId, bussId) => {
        const req = ExpressAdapter.createReq(ctx.req, ExpressAdapter.createRes());
        RequestHelperService.parseQueryStrings(req);

        const split = subId.split('.');
        const id = split[0] === 'apikey' 
          ? AuthHelperService.SERVER_TASK_OBJECT_ID[0]
          : split[2];

        const data = await createJwt(req, new ObjectId(id));
        return {...ret, ...data};
      },
      sxmp_fetch_fallback_model: async (context, return_value, models, modelClass, params) => {
        
        let c: AbstractDbApiItemController<any>;
        if (modelClass === ModelClass.User)
          c = new UserController() as any;
        else if (modelClass === ModelClass.ApiKey)  
          c = new ApiKeyController() as any;
        else if (modelClass === ModelClass.UserRole)
          c = new UserRoleController() as any;

        if (!c)
          return return_value;

        const req = ExpressAdapter.createReq(context.req, ExpressAdapter.createRes());
        const toR = await c.findForUser(req, { _id: { $in: params.ids } }, { base: { projection: params.projection || {} }, skipFilterControl: true });
        if (params.toFetch)
          await ModelFetchService.fetchAndSetFields(req, params.toFetch, toR);

        return toR;
      },
    }],
  },
  onUserAuth: async (mReq, raw, payload) => {
    const instanceId = raw.instanceId;
    const { username, password } = payload as any;
    const req = ExpressAdapter.createReq(mReq, ExpressAdapter.createRes());
    RequestHelperService.parseQueryStrings(req);

    try {
      // get active user, or create a new one if no one exists, or update the password if the user was migrated and has no password field
      let user: User | false;
      if (!(user = await getActiveVerifiedUser(req, username, password)))
        if (!(user = await maybeCreateFirstUser(req, username, password)))
          if (!(user = await maybeSetFirstPassword(req, username, password)))
            return {isAuthorized: false};
      
      const id: SubIdUser = `${'user'}.${user.role.id.toString()}.${user._id.toString()}`
      return {isAuthorized: true, subId: id};
    }
    catch (e) {
      console.log(e);
      return {isAuthorized: false};
    }

  },
  onKeyAuth: async (mReq, raw, key) => {
    const res = ExpressAdapter.createRes();
    const req = ExpressAdapter.createReq(mReq, res);
    RequestHelperService.parseQueryStrings(req);

    const [err, apiKey] = await to(new ApiKeyController().getCollToUse(req).findOne({_key: key}) as Promise<ApiKey>);
    if (err || !apiKey)
      return {isAuthorized: false};

    const id: SubIdApi = `${'apikey'}.${apiKey._id.toString()}`;
    return {isAuthorized: true, subId: id};
  },
});

(v && v.then && v.then(i => {
  process.on('SIGTERM', () => i.forceStop());
  process.on('beforeExit', () => i.forceStop());
  process.on('exit', () => i.forceStop());
}));

app.get('/api_test', (req, res) => {
  res.status(202).send({ api_test_ok: true, module_name: 'sixempress__labac' });
});

app.use((req, res, next) => (RequestHelperService.parseQueryStrings(req), next()));

BusinessLocationsService.start(app);

for (const c of [UserController, UserRoleController, ApiKeyController]) {
  ControllersService.registerController(c as any as typeof AbstractDbApiItemController);
  const controller = new c() as any as AbstractDbApiItemController<any>;
  controller.generateBePaths(app, new RequestHandlerService(controller));
}



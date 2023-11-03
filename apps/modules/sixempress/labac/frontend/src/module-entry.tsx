import './styles.css';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { createPortal } from 'react-dom';
import { ConnectorConfiguration, frontendConnector } from '@stlse/frontend-connector';
import { BePaths, Attribute, AttributeLabel } from './enums';
import { UsersTable } from './app/users/users.table';
import { UserRoleEditor } from './app/user-roles/user-role.editor';
import { UserEditor } from './app/users/user.editor';
import { UserRolesTable } from './app/user-roles/user-roles.table';
import { ApiKeysTable } from './app/api-keys/api-keys.table';
import { ApiKeyEditor } from './app/api-keys/api-key.editor';
import { authenticationServiceHooks } from './services/authentication/authentication-hooks';
import { IAvailableRoute, UiTransferContext, wrapped } from '@sixempress/main-fe-lib';
import { AuthService } from '@sixempress/abac-frontend';
import VpnKey from '@material-ui/icons/VpnKey';
import { UserController } from './app/users/user.controller';
import { BusinessLocationServiceHooks } from './services/business/business-topbar-hook';
import { businessLocationsActionHooks } from './services/business/business.hooks';
import { reactHookButton } from './services/business/business-locations.editor';

frontendConnector({
  react: { React, ReactDOM, createPortal },
  hooks: {
    actions: [
      authenticationServiceHooks,
      businessLocationsActionHooks,
      {
        sxmp_labac_format_user_name(context, return_value, user) {
          return UserController.formatName(user);
        },
      }
    ],
    react: [
      reactHookButton,
      BusinessLocationServiceHooks,
    ],
    filters: [
      {
        sxmp_override_request_service_destination_module: async (ctx, ret, module, endpoint, req) => {
          return Object.values(BePaths).some(e => endpoint.includes(e)) ? await use_action.stlse_module_name() as string : ret;
          // return Object.values(BePaths).some(v => endpoint.includes(v)) ? 'sixempress__labac' : ret;
        },
        sxmp_theme_app_routes: (ctx, ret) => {
          return [...ret, 
            {path: 'userlist', component: wrapped(UsersTable), children: [
              {path: 'editor', component: wrapped(UserEditor), children: [
                {path: ':editorComponentId', component: wrapped(UserEditor)},
              ]},
            ]},
            {path: 'userroles', component: wrapped(UserRolesTable), children: [
              {path: 'editor', component: wrapped(UserRoleEditor), children: [
                {path: ':editorComponentId', component: wrapped(UserRoleEditor)},
              ]},
            ]},
            {path: 'apikeys', component: wrapped(ApiKeysTable), children: [
              {path: 'editor', component: wrapped(ApiKeyEditor), children: [
                {path: ':editorComponentId', component: wrapped(ApiKeyEditor)},
              ]},
            ]},
          ];
        },
        sxmp_theme_sidebar: {
          priority: 11,
          fn: (ctx, ret) => {
            const additional: IAvailableRoute[] = [];
  
            if (AuthService.isAttributePresent(Attribute.viewUsers))
              additional.push({type: 'route', label: 'Utenti', routeLink: 'userlist' });
  
            if (AuthService.isAttributePresent(Attribute.viewUserRoles))
              additional.push({type: 'route', label: 'Ruoli', routeLink: 'userroles' });
  
            if (AuthService.isAttributePresent(Attribute.viewApiKeys))
              additional.push({type: 'route', label: 'Chiavi API', routeLink: 'apikeys' });
  
            if (!additional.length)
              return ret;
  
            return [
              ...ret, {
                type: 'collection', 
                icon: wrapped(VpnKey), 
                label: 'Accesso', 
                items: additional,
              }
            ];
          }
        },
      }
    ],
  },
});

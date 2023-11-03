import './styles.css';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { createPortal } from 'react-dom';
import * as _ from 'apps/modules/sixempress/multip-core/frontend/src/types/hooks';
import * as __ from 'libs/main-fe-lib/src/types/hooks';
import { frontendConnector } from '@stlse/frontend-connector';
import { UsedProductsTable } from './app/used-products/used-products.table';
import { SocketDbUpdateEmitter, UiTransferContext, wrapped } from '@sixempress/main-fe-lib';
import { BePaths } from './enums/bepaths';
import { Attribute, AttributeLabel } from './enums/attributes';
import { UsedProductEditor } from './app/used-products/used-products.editor';
import { AuthService } from '@sixempress/abac-frontend';
import SmartphoneIcon from '@material-ui/icons/Smartphone';

frontendConnector({
  react: { React, ReactDOM, createPortal },
  hooks: {
    filters: [{
      sxmp_override_request_service_destination_module: async (ctx, ret, module, endpoint, req) => {
          return Object.values(BePaths).some(e => endpoint.includes(e)) ? await use_action.stlse_module_name() as string : ret;
          // return Object.values(BePaths).some(e => endpoint.includes(e)) ? 'sixempress__usedproducts' : ret;
      },
      sxmp_labac_get_attribute_group_lists(context, return_value, n) {
        return [...return_value, {
          title: 'Usato',
          values: Object.values(Attribute).filter(v => typeof v === 'number').map(v => ({value: v as any, title: AttributeLabel[v] as any})),
        } ];
      },
      sidebar_routes: (ctx, r) => {
        const canView = AuthService.isAttributePresent(Attribute.viewUsedProducts);
        if (!canView)
          return r;
          
        return [
          ...r, 
          {icon: wrapped(SmartphoneIcon), name: 'Usato', path: 'usedproducts', component: wrapped(UsedProductsTable), childrens: [
            {name: '', path: 'editor', component: wrapped(UsedProductEditor), childrens: [
              {name: '', path: ':editorComponentId', component: wrapped(UsedProductEditor)},
            ]},
          ]},
        ]
      },
    }],
  },
});

SocketDbUpdateEmitter.setupDatatableSocketUpdates();

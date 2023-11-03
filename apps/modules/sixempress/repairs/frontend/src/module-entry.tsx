import './styles.css';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { createPortal } from 'react-dom';
import * as _ from 'apps/modules/sixempress/multip-core/frontend/src/types/hooks';
import * as __ from 'libs/main-fe-lib/src/types/hooks';
import { frontendConnector } from '@stlse/frontend-connector';
import { RepairsTable } from './app/repairs/repairs.table';
import { BePaths } from './enums/bepaths';
import { Attribute, AttributeLabel } from './enums/attributes';
import { RepairEditor } from './app/repairs/repair-editor/repair-editor';
import { RepairOperations } from './app/repairs/repair-operations/repair-operations';
import { ContextService, FetchableField, SocketDbUpdateEmitter, UiTransferContext, wrapped } from '@sixempress/main-fe-lib';
import { ModelClass } from './enums/model-class';
import { RepairController } from './app/repairs/repair.controller';
import { AuthService } from '@sixempress/abac-frontend';
import { RepairSettingsService } from './app/repairs/settings/repair-settings.service';
import BuildIcon from '@material-ui/icons/Build';

frontendConnector({
  react: { React, ReactDOM, createPortal },
  hooks: {
    react: [
      RepairSettingsService.reactHook,
      {
        sxmp_movement_detail_row: () => generatedFromDetail,
        sxmp_saleanalysis_detail_row: () => generatedFromDetail,
      }
    ],
    filters: [
      RepairController.filterHooks,
      {
        sxmp_productype_enum(context, return_value, n) {
          return_value['sxmp_repairs_replacements'] = 'sxmp_repairs_replacements';
          return return_value;
        },
        sxmp_productype_values(context, return_value, n) {
          return_value.push({label: 'Ricambi', value: 'sxmp_repairs_replacements'});
          return return_value;
        },
        sxmp_override_request_service_destination_module: async (ctx, ret, module, endpoint, req) => {
          return Object.values(BePaths).some(e => endpoint.includes(e)) ? await use_action.stlse_module_name() as string : ret;
          // return Object.values(BePaths).some(e => endpoint.includes(e)) ? 'sixempress__repairs' : ret;
        },
        sxmp_modelclass_values_for_sale_analysis: (ctx, ret) => {
          ret.push(ModelClass.Repair);
          return ret;
        },
        sxmp_modelclass_labels: (ctx, ret) => {
          ret[ModelClass.Repair] = 'Riparazioni';
          return ret;
        },
        sidebar_routes: (ctx, r) => {

          const canView = AuthService.isAttributePresent(Attribute.viewRepairs);
          if (!canView)
            return r;
            
          return [
            ...r, 
            {icon: wrapped(BuildIcon), name: 'Riparazioni', path: 'repairs', component: wrapped(RepairsTable), childrens: [
              {name: '', path: 'editor', component: wrapped(RepairEditor), childrens: [
                {name: '', path: ':editorComponentId', component: wrapped(RepairEditor)},
              ]},
              {name: '', path: 'operations', component: wrapped(RepairOperations), childrens: [
                {name: '', path: ':editorComponentId', component: wrapped(RepairOperations)},
              ]},
            ]},
          ]
        },
        sxmp_labac_get_attribute_group_lists(context, return_value, n) {
          return [...return_value, {
            title: 'Riparazioni',
            values: Object.values(Attribute).filter(v => typeof v === 'number').map(v => ({value: v as any, title: AttributeLabel[v] as any})),
          } ];
        },
      }
    ],
    actions: [
      RepairController.actionHooks,
      RepairSettingsService.actionHook,
    ]
  },
});

function generatedFromDetail(p: {item: {_generatedFrom?: FetchableField<any>}}) {
  if (!p.item._generatedFrom || p.item._generatedFrom.modelClass !== ModelClass.Repair)
    return null;

  return <RepairController.FullDetailJsx id={p.item._generatedFrom.id}/>;
}
SocketDbUpdateEmitter.setupDatatableSocketUpdates();

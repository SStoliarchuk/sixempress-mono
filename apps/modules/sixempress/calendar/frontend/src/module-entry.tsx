import './styles.css';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { createPortal } from 'react-dom';
import { frontendConnector, getReactWrapper } from '@stlse/frontend-connector';
import * as _ from 'apps/modules/sixempress/multip-core/frontend/src/types/hooks';
import * as __ from 'libs/main-fe-lib/src/types/hooks';
import { Attribute, AttributeLabel, BePaths, ModelClass, ModelClassLabel } from './enums';
import InsertInvitation from '@material-ui/icons/InsertInvitation';
import Calendar from './calendar/calendar';
import { AuthService, wrapped } from '@sixempress/main-fe-lib';
import { CustomerAppointmentsTable } from './customer-appointment/table/customer-appointment.table';
import { CustomerAppointmentEditor } from './customer-appointment/table/customer-appointment.editor';
import PermContactCalendarIcon from '@material-ui/icons/PermContactCalendar';

frontendConnector({
  react: { React, ReactDOM, createPortal },
  hooks: {
    filters: [
      {
        sxmp_modelclass_values_for_sale_analysis: (ctx, ret) => {
          ret.push(...Object.keys(ModelClass));
          return ret;
        },
        sxmp_modelclass_labels: (ctx, ret) => {
          for (const k in ModelClassLabel)
            ret[ModelClassLabel[k]] = k;
          return ret;
        },
        sxmp_theme_sidebar: (ctx, ret) => {
          if (AuthService.isAttributePresent(Attribute.viewCustomerAppointment))
            ret.unshift({type: 'route', label: 'Appuntamenti', routeLink: 'customerappointments', icon: wrapped(PermContactCalendarIcon)});

          if (AuthService.isAttributePresent(Attribute.viewCalendarEvents))
            ret.unshift({type: 'route', label: 'Calendario', routeLink: 'calendar', icon: wrapped(InsertInvitation)});

          return ret;
        },
        sxmp_theme_app_routes: (ctx, ret) => {
          return [...ret, 
            {path: 'calendar', component: wrapped(Calendar)},
            {path: 'customerappointments', component: wrapped(CustomerAppointmentsTable), children: [
              {path: 'editor', component: wrapped(CustomerAppointmentEditor), children: [
                {path: ':editorComponentId', component: wrapped(CustomerAppointmentEditor)},
              ]},
            ]},
          ]
        },
        sxmp_override_request_service_destination_module: async (ctx, ret, module, endpoint, req) => {
          return Object.values(BePaths).some(e => endpoint.includes(e)) ? await use_action.stlse_module_name() as string : ret;
          // return Object.values(BePaths).some(e => endpoint.includes(e)) ? 'sixempress__calendar' : ret;
        },
        sxmp_labac_get_attribute_group_lists(context, return_value, n) {
          return [...return_value, {
            title: 'Calendario',
            values: Object.values(Attribute).filter(v => typeof v === 'number' && String(v).startsWith(String(Attribute.viewCalendarEvents).substring(0, 3)))
              .map(v => ({value: v as any, title: AttributeLabel[v] as any})),
          }, {
            title: 'Appuntamenti Cliente',
            values: Object.values(Attribute).filter(v => typeof v === 'number' && String(v).startsWith(String(Attribute.viewCustomerAppointment).substring(0, 3)))
              .map(v => ({value: v as any, title: AttributeLabel[v] as any})),
          } ];
        }
      }
    ],
  },
});

import { ConnectorPayload, ReactInfo } from '@stlse/frontend-connector';
import { PaperProps, Theme } from "@material-ui/core";
import { RequestService as STLSeRequestService } from '@stlse/frontend-connector';
import { BusinessLocationsService, ConfirmModalComponent, DataStorageService, FieldsFactory, IAttMapping, IUserFilter, ModalService, OpenModalControls, RouterService, SelectFieldValue, SmallUtils, UiSettings } from "@sixempress/main-fe-lib";
import { AuthService } from '@sixempress/abac-frontend';
import React from "react";
import ReactDOM from "react-dom/client";
import { SocketService } from "../services/socket/socket.service";
import { Attribute, AttributeLabel } from "../utils/enums/attributes";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import { openReceiptModal } from "../components/multi-purpose/sales/receipt/print-receipt.modal";
import { Movement } from '../components/multi-purpose/movements/Movement';
import { SaleAnalysis } from '../components/multi-purpose/sale-analyses/SaleAnalysis';
import { codeScanTypeInfo } from '../services/barcode/code-scanner-events.service';

export {};

export type Route = {icon?: any, name: string, path: string, component: any, childrens?: Route[]};

declare global {
  interface actions {
    sxmp_localStorage: () => typeof DataStorageService['localStorage'],
    sxmp_sessionStorage: () => typeof DataStorageService['sessionStorage'],

    sxmp_socket_is_active: () => boolean,
    sxmp_socket_on: (code: SocketCodes, listener: (...args: any[]) => void) => void,
    sxmp_socket_off: (code: SocketCodes, listener: (...args: any[]) => void) => void,
  }
  interface react_hooks {
    sxmp_system_settings_content: (p: {}) => any,
  }

  interface filters {
    sxmp_codescanner_events_decompose_codescan_type: (decoded: codeScanTypeInfo, original: string) => codeScanTypeInfo,
    sxmp_codescanner_events_compose_barcode: (composed: string, typePrefix: string | number, object: object) => string,
    sxmp_codescanner_events_query_filter_by_barcode_type: (filter: IUserFilter, decoded: codeScanTypeInfo) => string,

    sxmp_productype_enum: (n: {[x: number | string]: number | string}) => {[x: number | string]: number | string},
    sxmp_productype_values: (n: SelectFieldValue[]) => SelectFieldValue[],

    sxmp_modelclass_labels: (n: {[x: string]: string}) => {[x: string]: string};
    sxmp_modelclass_values_for_sale_analysis: (n: string[]) => string[];

    sidebar_routes: (routes: Route[]) => Route[],

    sxmp_modal_open_component: (args: Parameters<typeof ModalService['open']>, react: React, reactDom: ReactDOM) => Parameters<typeof ModalService['open']>;
  }

  interface actions {
    // sxmp_modal_open: (react: ReactInfo, ...args: Parameters<typeof ModalService['open']>) => ReturnType<typeof ModalService['open']>,
    sxmp_openReceiptModal: (props: ReceiptModalProps) => OpenModalControls,
    sxmp_codescanner_events_process_read: (decoded: codeScanTypeInfo) => Promise<any> | any,
  }

  interface react_hooks {
    paper: (p: { style?: PaperProps['style'] }) => any,
    sxmp_movement_detail_row: (p: {item: Movement}) => any,
    sxmp_saleanalysis_detail_row: (p: {item: SaleAnalysis}) => any,
  }

}

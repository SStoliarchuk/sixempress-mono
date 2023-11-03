export * from '@sixempress/utilities';
export * from '@sixempress/theme';

// styles
export * from './types/hooks.d';

export type Omit<T, K extends keyof any> = T extends any ? Pick<T, Exclude<keyof T, K>> : never;

/**
 * utils
 */
 export * from './app/services/context-service/context.dtd';
 export * from './app/utils/various/react-utils/react-utils';
 export * from './app/utils/stlse';
 // export * from './app/utils/touch-actions/touch-action.utils';
 // export * from './app/utils/touch-actions/touch-action.utils.dtd';
 // export * from './app/utils/various/object-utils';
 // export * from './app/utils/various/action-register';
 export * from './app/utils/various/small-utils';
 export * from './app/utils/types/mediafile.dtd';
 export * from './app/utils/enums/default-enums.enum';
 export * from './app/utils/enums/cache-keys.enum';
 export * from './app/utils/enums/html-ids.enum';
 // export * from './app/utils/various/beep';
 // export * from './app/utils/lib-startup/lib-factory';
 export * from './app/utils/enums/query-parameters.enum';
 export * from './app/utils/various/helpers';
 
 export * from './app/utils/enums/bepaths.enum';
 // errors
 export * from './app/utils/errors/error-factory';
 export * from './app/utils/errors/errors';
 export * from './app/utils/errors/handler/global-error-handler';
 export * from './app/utils/errors/handler/global-error-boundary';
 export * from './app/services/ui-error/offline-snackbar';
 export * from './app/services/ui-error/ui-error.service';
 export * from './app/services/ui-error/dtd';

/**
 * services
 */

// controller
export * from './app/services/controllers/dtd';

// services
export * from './app/services/socket/db-update-emitter/db-update-emitter-dt.interface';
export * from './app/services/socket/db-update-emitter/socket-db-update-emitter';
export * from './app/services/socket/socket.dtd';
export * from './app/services/socket/socket.service';
export * from './app/services/socket/socket.utils';
export * from './app/services/authentication/authentication';
export * from './app/services/tutorial/tutorial.service';
export * from './app/services/code-scanner.service';
export * from './app/services/context-service/context-service';
export * from './app/services/request-service/request-service';
export * from './app/services/router/router-service';
// export * from './app/services/router/router.dtd';
export * from './app/services/time-service/time-service';
export * from './app/services/business/business-locations.service';
export * from './app/services/component-communication.service';
export * from './app/services/dtd';
export * from './app/services/modal-service/modal.service';
// export * from './app/services/modal-service/modal.service.dtd';
export * from './app/services/notifications/notification-services';
// export * from './app/services/notifiactions/notifications.dtd';
export * from './app/services/snackbars/snackbar.service';
// export * from './app/services/snackbars/snackbar.dtd';
export * from './app/services/ui/ui-settings.service';
export * from './app/services/ui/ui-components';
export * from './app/services/data-formatter.service';
export * from './app/services/mediafiles/mediafile.service';
export * from './app/services/mediafiles/dtd';
export * from '@sixempress/utilities';
export * from './app/services/url-service/url.service';


/**
 * item-controller
 */
export * from './app/services/controllers/abstract-db-item.controller';
export * from './app/services/controllers/controllers.dtd';
export * from './app/services/controllers/controllers.service';

/**
 * helper-components
 */

// responsive-table
export * from './app/helper-components/responsive-table/responsive-table';
export * from './app/helper-components/responsive-table/dtd';

// multi page
export * from './app/helper-components/multi-page/dtd';
export * from './app/helper-components/multi-page/multi-page';

// abstract-editor
export * from './app/helper-components/abstract-editor/custom-validators';
export * from './app/helper-components/abstract-editor/dtd/abstract-editor.dtd';
export * from './app/helper-components/abstract-editor/dtd/editor-parts.dtd';
export * from './app/helper-components/abstract-editor/dtd/fields.dtd';
export * from './app/helper-components/abstract-editor/abstract-editor.logic';
export * from './app/helper-components/abstract-editor/abstract-editor';

// async model table select
export * from './app/helper-components/async-model-table-select/async-model-table-select';
export * from './app/helper-components/async-model-table-select/dtd';

// dt
export * from './app/helper-components/datatables/abstract/dtd';
export * from './app/helper-components/datatables/abstract/abstract-basic-dt';
export * from './app/helper-components/datatables/abstract/abstract-basic-dt.logic';
export * from './app/helper-components/datatables/abstract/abstract-dt-helper';
export * from './app/helper-components/datatables/custom-dt-types';
export * from './app/helper-components/datatables/dt-logic/datatable.dtd';
export * from './app/helper-components/datatables/dt-logic/datatable';
export * from './app/helper-components/datatables/dt-filters/dtd';
export * from './app/helper-components/datatables/dt-settings/dtd';

// dt-filters
export * from './app/helper-components/datatables/dt-filters/dtd';
export * from './app/helper-components/datatables/dt-filters/dt-filters.component';
export * from './app/helper-components/datatables/dt-filters/datetime-filter/datetime-filter.component';
export * from './app/helper-components/datatables/dt-filters/select-filter/select-filter.component';

// helpers
export * from './app/helper-components/loading-overlay/loading-overlay';
export * from './app/helper-components/confirm-modal';
export * from './app/helper-components/chose-location/chose-location';

// fields-factory
export * from './app/helper-components/fields/fields-factory';
export * from './app/helper-components/fields/dtd';

export * from './app/helper-components/global-draggable/global-draggable';


// types

type _JSXSupportedType = string | number | boolean | JSX.Element;
export type JSXSupportedType = _JSXSupportedType | (_JSXSupportedType[]);

/**
 * Returns the argument for the function or class
 * in case you pass class you need to pass typeof: \
 * ArgumentTypes<typeof Class>
 */
export type ArgumentTypes<F> = 
	// class
	F extends new (...args: infer A) => any 
	? A

	// function	
	: F extends (...args: infer B) => any 
	? B 
	
	: never;

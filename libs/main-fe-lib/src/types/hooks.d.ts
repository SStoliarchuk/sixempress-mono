import ReactDOM from 'react-dom/client';
import React from 'react';
import { ModalService } from '../app/services/modal-service/modal.service';
import { BusinessLocationsService } from '../app/services/business/business-locations.service';
import { UiSettings } from '../app/services/ui/ui-settings.service';
import { RouterService } from '../app/services/router/router-service';
import { ConfirmModalComponent } from '../app/helper-components/confirm-modal';
import { DataStorageService } from '@sixempress/utilities';
import { SmallUtils } from '@sixempress/utilities';
import { ReactInfo } from '@stlse/frontend-connector';
import { RequestParams } from '../app/services/request-service/request.dtd';

declare global {
  interface filters {
    sxmp_override_request_service_destination_module: (module: string | Promise<string>, endpoint: string, req: RequestParams<any>) => string | Promise<string>,
  }
  interface actions {    
  }
  interface react_hooks {
  }
}

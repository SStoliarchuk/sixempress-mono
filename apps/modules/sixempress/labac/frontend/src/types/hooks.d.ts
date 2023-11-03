import { BusinessLocation, FetchableField } from '@sixempress/main-fe-lib';
import { User } from '../app/users/User';
import { BusinessLocationsService } from '../services/business/business-locations.service';
import { AuthResponse } from '../services/context-service/context.dtd';
import { AttributeGroup, IAttMapping } from '../app/user-roles/user-role.controller';
export {};

declare global {
  interface filters {
    sxmp_labac_attributes_enum: (n: {[x: number | string]: number | string}) => {[x: number | string]: number | string},
    sxmp_labac_attributes_enum_labels: (n: {[x: number]: string}) => {[x: number]: string},
    sxmp_labac_get_attribute_group_lists: (n: AttributeGroup[]) => AttributeGroup[],
    sxmp_labac_attributes_required_mapping: (n: IAttMapping[]) => IAttMapping[],
  }
  
  interface actions {
    sxmp_labac_format_user_name: (user: User | FetchableField<User>) => string,
    sxmp_labac_get_current_user: () => User,
    sxmp_is_attribute_present: (attr: number | string) => boolean,

    // locations
    sxmp_set_chosen_location_id: (v: string) => void,
    sxmp_get_chosen_location_id: () => string,
    
    sxmp_set_addChosenLocationFilter: (v: boolean) => void,
    sxmp_get_addChosenLocationFilter: () => boolean,

    sxmp_set_addChosenLocationContent: (v: boolean) => void,
    sxmp_get_addChosenLocationContent: () => boolean,

    sxmp_set_chosenLocationId: (v: string | undeined) => void,
    sxmp_get_chosenLocationId: () => string | undefined,

    sxmp_get_locations_by_user: (keepDisabled: boolean) => BusinessLocation[],
    sxmp_get_all_locations: (keepDisabled: boolean) => BusinessLocation[],

    sxmp_formatLocationsForSelect(locs: BusinessLocation | BusinessLocation[] | string[]): SelectFieldValue[];
    sxmp_getDocPosSelectValues(value?: string): SelectFieldValue[],
    sxmp_getDocVisSelectValues(value?: string[]): SelectFieldValue[]
    sxmp_getNameById(id: string, idx?: number): string
    sxmp_updateByBusiness(config: LocationsData): void
  }

}

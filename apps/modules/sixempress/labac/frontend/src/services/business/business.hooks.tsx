import { HookActions } from "@stlse/frontend-connector";
import { BusinessLocationsService } from "./business-locations.service";

export const businessLocationsActionHooks: HookActions = {
  sxmp_get_chosen_location_id: () => BusinessLocationsService.chosenLocationId,
  sxmp_get_addChosenLocationFilter: () => BusinessLocationsService.addChosenLocationFilter,
  sxmp_get_addChosenLocationContent: () => BusinessLocationsService.addChosenLocationContent,
  sxmp_get_chosenLocationId: () => BusinessLocationsService.chosenLocationId,
  sxmp_set_chosen_location_id: (ctx, ret, v) => BusinessLocationsService.chosenLocationId = v,
  sxmp_set_addChosenLocationFilter: (ctx, ret, v) => BusinessLocationsService.addChosenLocationFilter = v,
  sxmp_set_addChosenLocationContent: (ctx, ret, v) => BusinessLocationsService.addChosenLocationContent = v,
  sxmp_set_chosenLocationId: (ctx, ret, v) => BusinessLocationsService.chosenLocationId = v,
  
  sxmp_get_locations_by_user: (ctx, ret, ...args) => BusinessLocationsService.getLocationsFilteredByUser(...args),
  sxmp_get_all_locations: (ctx, ret, ...args) => BusinessLocationsService.getAllLocations(...args),
  sxmp_getDocPosSelectValues:(ctx, ret, ...args) => BusinessLocationsService.getDocPosSelectValues(...args),
  sxmp_getDocVisSelectValues:(ctx, ret, ...args) => BusinessLocationsService.getDocVisSelectValues(...args),
  // sxmp_notify: (ctx, ret, ...args) => SmallUtils.notify(...args),
  sxmp_getNameById: (ctx, ret, ...args) => BusinessLocationsService.getNameById(...args),
  sxmp_formatLocationsForSelect: (ctx, ret, ...args) => BusinessLocationsService.formatLocationsForSelect(...args),
  sxmp_updateByBusiness: (ctx, ret, ...args) => BusinessLocationsService.updateByBusiness(...args),
}
export class BusinessLocationsService {

  static getLocationsFilteredByUser = ((...args) => use_action.sxmp_get_locations_by_user(...args)) as typeof use_action.sxmp_get_locations_by_user;
  
  static getAllLocations = ((...args) => use_action.sxmp_get_all_locations(...args)) as typeof use_action.sxmp_get_all_locations;

	static getDocPosSelectValues = ((...args) => use_action.sxmp_getDocPosSelectValues(...args)) as typeof use_action.sxmp_getDocPosSelectValues
  
	static getDocVisSelectValues = ((...args) => use_action.sxmp_getDocVisSelectValues(...args)) as typeof use_action.sxmp_getDocVisSelectValues

	static formatLocationsForSelect = ((...args) => use_action.sxmp_formatLocationsForSelect(...args)) as typeof use_action.sxmp_formatLocationsForSelect
	
	static getNameById = ((...args) => use_action.sxmp_getNameById(...args)) as typeof use_action.sxmp_getNameById
	
	static updateByBusiness = ((...args) => use_action.sxmp_updateByBusiness(...args)) as typeof use_action.sxmp_updateByBusiness
	
  static get chosenLocationId() { return use_action.sxmp_get_chosen_location_id(); };
  
	static get addChosenLocationFilter() { return use_action.sxmp_get_addChosenLocationFilter(); }
  
	static get addChosenLocationContent() { return use_action.sxmp_get_addChosenLocationContent(); }

	static set chosenLocationId(v) { use_action.sxmp_set_chosen_location_id(v); };
  
	static set addChosenLocationFilter(v) { use_action.sxmp_set_addChosenLocationFilter(v); }
  
	static set addChosenLocationContent(v) { use_action.sxmp_set_addChosenLocationContent(v); }

}
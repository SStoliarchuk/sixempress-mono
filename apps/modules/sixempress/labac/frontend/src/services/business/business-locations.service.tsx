import { DataStorageService } from "@sixempress/utilities";
import { Subject } from "rxjs";
import { ObjectUtils } from "@sixempress/utilities";
import { SelectFieldValue } from "@sixempress/main-fe-lib";
import { AuthService } from '@sixempress/abac-frontend';
import { Attribute, CacheKeys } from "../../enums";
import { BusinessLocation, LocationsData as LocationsData } from "../context-service/context.dtd";

export class BusinessLocationsService {

	/**
	 * Contains all the locations of the system
	 */
	private static rawLocations: BusinessLocation[] = [];

	/**
	 * Hashmap of location id and its data
	 */
	private static rawLocationsHM: {[_id: string]: BusinessLocation} = {};

	/**
	 * Emits next when the chosen location is changed
	 */
	public static chosenLocationChanges = new Subject<string | undefined>();

	private static _chosenLocationId: undefined | string;

	private static _addChosenLocationContent: boolean = false
	
	private static _addChosenLocationFilter: boolean = false; // later will be updated properly
	
	
	/**
	 * Returns a flag that signal if the chosen location has to be used as a filter too
	 */
	public static get addChosenLocationContent(): boolean {
		return BusinessLocationsService._addChosenLocationContent; 
	}
	public static set addChosenLocationContent(v: boolean) {
		BusinessLocationsService._addChosenLocationContent = v;
		DataStorageService.localStorage.setItem(CacheKeys.addLocationContentFilter, v.toString());
	}

	/**
	 * Returns a flag that signal if the chosen location has to be used as a filter too
	 */
	public static get addChosenLocationFilter(): boolean { 
		return BusinessLocationsService._addChosenLocationFilter; 
	}

	public static set addChosenLocationFilter(v: boolean) {
		BusinessLocationsService._addChosenLocationFilter = v;
		DataStorageService.localStorage.setItem(CacheKeys.addLocationFilter, v.toString());
	}


	/**
	 * Contains the chosen location id of the user,
	 * 
	 * if a user has chosen one location specifically, then this value will be the chosen location id
	 * 
	 * if a user has chosen to see ALL locaitons, then this value will be undefined
	 * 
	 */
	public static get chosenLocationId(): string { 
		return BusinessLocationsService._chosenLocationId;
	}

	public static set chosenLocationId(val: undefined | string) {
		// unset the value
		if (!val || !BusinessLocationsService.rawLocationsHM[val]) {
			BusinessLocationsService._chosenLocationId = undefined;
			DataStorageService.localStorage.removeItem(CacheKeys.chosenLocation);
		}
		// set the value
		else {
			BusinessLocationsService._chosenLocationId = val;
			DataStorageService.localStorage.setItem(CacheKeys.chosenLocation, val);
		}
		// emit
		BusinessLocationsService.chosenLocationChanges.next(BusinessLocationsService._chosenLocationId);
	}

	/**
	 * Cheks if the chosenLocaitonId is still available in the locations array
	 */
	public static updateByBusiness(config: LocationsData) {
		
		BusinessLocationsService.rawLocations = config.locations;
		BusinessLocationsService.rawLocationsHM = ObjectUtils.arrayToHashmap(config.locations, '_id');

		const visible = BusinessLocationsService.getLocationsFilteredByUser(false);

		// start with the location filter off
		// the update is here and not in restoreCache() as we need to ensure
		// that the user has more than 1 location avaible else this will cause errors
		if (visible.length === 1) {
			BusinessLocationsService.addChosenLocationFilter	= false
			BusinessLocationsService.addChosenLocationContent = false;	
		}
		else {
			BusinessLocationsService.addChosenLocationFilter = DataStorageService.localStorage.getItem(CacheKeys.addLocationFilter) === 'true'
			BusinessLocationsService.addChosenLocationContent = DataStorageService.localStorage.getItem(CacheKeys.addLocationContentFilter) === 'true'
		}

		// if only 1 loc, set as chosen location
		if (visible.length === 1) {
			BusinessLocationsService.chosenLocationId = visible[0]._id;
		}
		// else restored a stored selection if present
		else {
			const storedLocId = BusinessLocationsService.chosenLocationId || DataStorageService.localStorage.getItem(CacheKeys.chosenLocation);
			
			BusinessLocationsService.chosenLocationId = storedLocId && BusinessLocationsService.rawLocationsHM[storedLocId] 
				? storedLocId
				: undefined;
		}
	}
	

	public static getLocationsFilteredByUser(keepDisabled: boolean) {
		const current = BusinessLocationsService.getAllLocations(keepDisabled);
		const available = use_action.stlse_auth_get_token_data().data.locs;
		if (available[0] === '*')
			return current;

		const filtered: typeof current = [];
		for (const c of current)
			if (available.includes(c._id))
				filtered.push(c);

		return filtered;
	}
	
	
	/**
	 * returns all the locations
	 * @param keepDisabled if true returns the disabled locations too
	 */
	public static getAllLocations(keepDisabled: boolean) {
		return keepDisabled
			? BusinessLocationsService.rawLocations
			: BusinessLocationsService.rawLocations.filter(l => l.isActive);
	}

	/**
	 * Given an array of locations, returns an array of selectFieldsValue to use for a select
	 */
	public static formatLocationsForSelect(locs: BusinessLocation | BusinessLocation[] | string[]): SelectFieldValue[] {

		const tor: SelectFieldValue[] = [];

		for (const info of Array.isArray(locs) ? locs as BusinessLocation[] | string[] : [locs as BusinessLocation]) {
			const l: BusinessLocation | void = typeof info === 'string' ? BusinessLocationsService.rawLocationsHM[info] : info;
			const id = typeof info === 'string' ? info : info._id;

			tor.push(!l || !l.address 
				? {
					value: id,
					label: BusinessLocationsService.getNameById(id),
				}
				: {
					value: id,
					label: BusinessLocationsService.getNameById(id),
					
					menuLabel: (
						<span>
							{BusinessLocationsService.getNameById(id)}<br/>
							<small className='loc-select-small-fix'>{l.address}</small>
						</span>
					) 
				}
			);
		}

		return tor;
	}

	/**
	 * Safely returns a name of location or a fallback in case the user cant see the location
	 * @param id the id of the locations
	 * @param idx an optional index to append at the end in case the locaction is not found
	 */
	 public static getNameById(id: string, idx?: number): string {
		if (BusinessLocationsService.rawLocationsHM[id])
			return BusinessLocationsService.rawLocationsHM[id].name;

		if (typeof idx !== 'undefined')
			return 'Altra Posizione #' + (idx + 1);

		return 'Altra Posizione';
	}

	/**
	 * Returns the select values for the DocumentVisibility select field
	 */
	public static getDocVisSelectValues(value?: string[]): SelectFieldValue[] {
		// start with the possible location
		const docVisVal = BusinessLocationsService.formatLocationsForSelect(
			BusinessLocationsService.getLocationsFilteredByUser(false)
		);
		
		// add global visibilty value
		if (AuthService.isAttributePresent(Attribute.canSetGlobalLocFilter) || (value && value.includes('*')))
			docVisVal.unshift({value: '*', label: "GLOBALE"});

		// add fields present in the value but not visible to the user
		if (value) {
			for (let i = 0; i < value.length; i++) {
				// skip global
				if (value[i] === '*') 
					continue;

				if (!docVisVal.find(v => v.value === value[i])) {
					const formatted = BusinessLocationsService.formatLocationsForSelect([value[i]])[0];
					formatted.label = BusinessLocationsService.getNameById(value[i], i);
					docVisVal.push(formatted);
				}
			}
		}

		return docVisVal;
	}

	/**
	 * Returns the select values for the DocumentLocation select field
	 */
	public static getDocPosSelectValues(value?: string): SelectFieldValue[] {

		// shows the disabled only if present in object value
		const docVisVal = BusinessLocationsService.formatLocationsForSelect(
			BusinessLocationsService.getLocationsFilteredByUser(false)
		);

		// add missing value as "OTHER LOCATION" option
		if (value && !docVisVal.find(v => v.value === value))
			docVisVal.push(BusinessLocationsService.formatLocationsForSelect([value])[0]);

		return docVisVal;
	}

}

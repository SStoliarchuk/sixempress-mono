import { User } from '../../app/users/User';
import { BePaths } from '../../enums';
import { BusinessLocationsService } from '../business/business-locations.service';
import { LocationsData } from '../context-service/context.dtd';
// import { RouterService } from '../router/router-service';

/**
 * Extends the context service by providing calls for managing the auth state context
 */
export class AuthService {

	public static SERVER_TASK_OBJECT_ID = [
		'000000000000000000000000', '000000000000',
	];


	public static currentUser: User;

	public static async logout() {
		window.location.href = window.location.href;
	}
	
	public static async onAfterLoginActions() {
		// set current user
		const response = await Promise.all([
			use_action.stlse_request('GET', BePaths.userlist + 'self', {params: {fetch: []}}),
			use_action.stlse_request('GET', BePaths.locationsdata, {}),
		]);
		const user: User = response[0].data;
		const locations: LocationsData = response[1].data;
		
		AuthService.currentUser = user;
		BusinessLocationsService.updateByBusiness(locations);
	}

	/**
	 * Checks if a required attribute is present in the current user
	 * @param attribute The attribute to check
	 */
	public static isAttributePresent(attribute: number | string): boolean {
		const d = use_action.stlse_auth_get_token_data();
		if (!d)
			return false;

		if (AuthService.currentUser && AuthService.SERVER_TASK_OBJECT_ID.includes(AuthService.currentUser._id))
			return true;

		const data = d.data;
		return data && Array.isArray(data.att) && data.att.includes(attribute);
	}

}


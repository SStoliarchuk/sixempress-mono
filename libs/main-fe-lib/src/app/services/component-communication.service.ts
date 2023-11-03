import { ErrorFactory } from '../utils/errors/error-factory';

/**
 * This class is used a cache to communicate between the components of the system
 */
export class ComponentCommunicationService {

	private static cache: {
		[target: string]: {
			TTL: number,
			data: any
		}
	} = {};

	/**
	 * Saves the data in the cache
	 * @param target The target component for the info
	 * @param data The data to trasmint
	 * !!!! I reccomend using the name of a class or the name of the component selector in angular !!!!
	 * @param TTL The time to live, in this case is how many times the data can be accessed
	 */
	public static setData(target: string, data: any, TTL: number = 1) {
		if (TTL > 100) { throw ErrorFactory.make('A TTL higher than 100 not allowed'); }
		this.cache[target] = {TTL, data};
	}

	/**
	 * Gets the data from the cache
	 * @param target The target object to get the data from
	 * @param removeData If true, removes the cached data after getting it
	 */
	public static getData(target: string, removeData?: true) {
		let toR: any;
		if (this.cache[target]) {
			if (this.cache[target].TTL < 2) {
				toR = this.cache[target].data;
				delete this.cache[target];
			} 
			else {
				toR = this.cache[target].data;
				this.cache[target].TTL -= 1;
				if (removeData) {
					delete this.cache[target];
				}
			}
		}
		return toR;
	}

}

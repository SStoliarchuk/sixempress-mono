import moment from 'moment';

export class TimeService {

	/**
	 * The time difference beetwen the client and the user
	 * It's used to calculate the exact time on the client machine syncronously
	 */
	public static offsetTimeWithServer: number;

	/**
	 * Returns Date object with server time offset
	 */
	public static getCorrectDate(): Date {
		return this.getCorrectMoment().toDate();
	}

	/**
	 * Returns moment object with server time offset
	 */
	public static getCorrectMoment(): moment.Moment {
		return moment((moment().unix() + (this.offsetTimeWithServer || 0)) * 1000);
	}

	/**
	 * Returns unix time corrected
	 */
	public static getCorrectUnix(): number {
		return this.getCorrectMoment().unix()
	}

	/**
	 * Sets the last retrieved timestamp from the
	 * @param serverTimestamp the current timestamp on the BE
	 */
	public static setManualOffset(serverTimestamp: number) {
		TimeService.offsetTimeWithServer = serverTimestamp - moment().unix();
	}
	
}

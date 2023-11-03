import bowser from 'bowser';

export class DeviceInfoService {

	/**
	 * contains the data prased from bowser
	 */
	private static bowserData: bowser.Parser.ParsedResult = bowser.parse(navigator.userAgent || '0');

	/**
	 * Checks if the device is internet explorer ehm, i mean apple
	 */
	public static isApple() {
		return this.bowserData.platform.vendor === 'Apple';
	}

}
import { IBaseModel } from "@sixempress/main-be-lib";

export enum ApiKeyType {
	manual = 1,
	/**
	 * Used for external connection etc..etc..
	 */
	internalSystem,
}

export interface ApiKey extends IBaseModel {
	/**
	 * The actual key to use
	 * the format is the following:
	 * 
	 * `{ slug }--{ crypto.randomBytes(32).toString('hex') }`
	 * so you can check the slug based on the key
	 */
	_key?: string,

	name: string;
	attributes: number[];
	availableLocations: string[];
	expires: number | false;
	type: ApiKeyType;
	isDisabled?: boolean;
}

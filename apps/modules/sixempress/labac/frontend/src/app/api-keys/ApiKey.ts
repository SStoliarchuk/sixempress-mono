import { IBaseModel } from "@sixempress/main-fe-lib";


export enum ApiKeyType {
	manual = 1,
	/**
	 * Used for external connection etc..etc..
	 */
	internalSystem,
}

export enum ApiKeyTypeLabel {
	"Manule" = ApiKeyType.manual,
	"Chiave Interna" = ApiKeyType.internalSystem,
}

export interface ApiKey extends IBaseModel {
	/**
	 * The actual key to use
	 * the format is the following:
	 * 
	 * `{ slug }_{ crypto.randomBytes(32).toString('hex') }{ unixTime() }`
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

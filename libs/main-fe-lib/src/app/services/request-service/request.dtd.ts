import { QueryParameters } from "../controllers/controllers.dtd";
import { FetchOptions } from "@stlse/frontend-connector";

export interface RequestParams<T = any> extends FetchOptions {

	/**
	 * Query parameters
	 */
	params?: QueryParameters<T>,

	/**
	 * Disables the loading overlay
	 */
	disableLoading?: boolean,

	/**
	 * Add ChosenLocationId as query parameter to the request
	 * @default true
	 */
	addChosenLocationFilter?: boolean;

	/**
	 * Add ChosenLocationId as query parameter to the request
	 * @default true
	 */
	addChosenLocationContent?: boolean;

}
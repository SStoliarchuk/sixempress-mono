import { SvgIconProps } from "@material-ui/core/SvgIcon";
import { ComponentType } from "react";

// TODO add the possibility to generate the components only withouth the routing

export interface MultiPagesConfiguration {

	/**
	 * The icon to reppresent the page,
	 * if no icon is given, it will be a generic bullet
	 */
	icon?: ComponentType<SvgIconProps>;
	/**
	 * The name that will be visible on the page changer
	 */
	name: string;

	/**
	 * The router path to match to open this component
	 * this path should contain only the last part of the path
	 * 
	 * fullpath = abc/def/ghi => routePath: "ghi"
	 * fullpath = abc/def/123 => routePath: "123"
	 * 
	 * it will be used by the page switcher to change page
	 * 
	 * THE PATH SHOULD NOT HAVE A STRATING SLASH 
	 * WRONG: /childpath
	 * RIGHT: childpath
	 */
	routePath: string;

	attributes?: {required?: number[]};

}

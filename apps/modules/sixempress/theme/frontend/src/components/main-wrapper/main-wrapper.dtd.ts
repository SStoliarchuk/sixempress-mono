import { ComponentType } from "react";
import { SvgIconProps } from "@material-ui/core/SvgIcon";

/**
 * This is the route that will be used to declare the available
 * options for the sidebar in the mainwrapper
 */
export declare type IAvailableRoute = {
	type: 'route',
	label: string;
	routeLink: string;
	icon?: ComponentType<SvgIconProps>;
} | {
	type: 'divider',
} | {
	type: 'collection',
	label: string;
	items: IAvailableRoute[],
	icon?: ComponentType<SvgIconProps>,
};


export type touchStart = {
	/**
	 * Where the touchstart event started
	 * used to open/close the drawer with a swipe
	 */
	x: number,
	/**
	 * The time the touch started in ms
	 */
	ms: number;
	/**
	 * the scrollLeft of the target element
	 * Set to zero if no scroll parent
	 */
	scrollableEventParent: number;
};
export type swipeTrigger = {
	/**
	 * The distance from the starting point
	 */
	distance: 70,
	/**
	 * The active zone where the touch have to start
	 */
	xZone: 120,
	/**
	 * The time to reach the distance to open the drawer
	 */
	ms: 200
};

export interface MDProps {
	initialOpen: boolean;
	sidebar: IAvailableRoute[],
	onToggle?: (isOpen: boolean) => void;
}

export interface MDState {
	open: boolean;
	sidebarVoices: IAvailableRoute[],
}

import { ComponentType } from "react";

export interface RouteDeclaration {
	path: string | {},
	component?: ComponentType<any>,
	children?: RouteDeclaration[],
	handleChildren?: boolean,
}

export interface RouteComponentProps {
	router?: {path: string, children?: AdjustedRouteDeclaration[]},
}

export interface RSProps {
	routes: RouteDeclaration[];
	asChildRouter?: AdjustedRouteDeclaration[],
}

export interface AdjustedRouteDeclaration extends Omit<RouteDeclaration, 'path' | 'component' | 'children'> {
	path: string,
	component: JSX.Element,
	children?: AdjustedRouteDeclaration[],
}

export interface RSState {
	/**
	 * Routes with the corrected path and in correct order etc
	 */
	adjustedRoutes: AdjustedRouteDeclaration[];
}
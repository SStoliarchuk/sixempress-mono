import { ActionEmitter } from '@sixempress/utilities';
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, NavigateFunction, matchPath, Outlet } from 'react-router-dom';
import { AdjustedRouteDeclaration, RouteComponentProps, RouteDeclaration, RSProps, RSState } from './router.dtd';

export class RouterService extends React.Component<RSProps, RSState> {

	private static navigateFunction: NavigateFunction;

	public static onNavigate = new ActionEmitter<[string]>();
		
	// TODO improve this outlet as it requires a key to work
	public static Outlet = function RouterOutlet(p: {props: RouteComponentProps}) {
		const [path, setPath] = useState<string>(Math.random().toString());
		useEffect(() => {
			const fn = (p: string) => setPath(p);
			RouterService.onNavigate.addListener(fn);
			return () => RouterService.onNavigate.removeListener(fn);
		}, []);

		if (!p.props.router)
			return null;

		const r = p.props.router.children || [];
		if (!r.length)
			return null;

		return (<RouterService key={path} routes={[]} asChildRouter={r}/>);
	}
	

	// save the useNavigate hook
	private static HookRoutes = function HookRoutes(props: {children: any}) {
		RouterService['navigateFunction'] = useNavigate();
		return <Routes {...props}/>
	}

	private static navigate = (path: string, opts?: {replace?: boolean}) => {
		RouterService.navigateFunction(path, opts);
		RouterService.onNavigate(path);
	}

	/**
	 * Generates routes
	 */
	public static getDerivedStateFromProps(props: RSProps, state: RSState): Partial<RSState> {
		return { ...state, adjustedRoutes: props.asChildRouter || RouterService.getAdjustRoutes(props.routes) };
	}

	/**
	 * Add correct prefixes to paths etc
	 */
	private static getAdjustRoutes(routes: RouteDeclaration[], prefix: string | {} = ''): AdjustedRouteDeclaration[] {
		const adjusted: AdjustedRouteDeclaration[] = [];

		for (const r of routes) {
			const children = r.children && RouterService.getAdjustRoutes(r.children, prefix + r.path.toString() + '/');
			
			if (r.component) {
				const InstanceComponent = r.component;

				// if is absolute then do not add prefix
				const p = r.path.toString();
				const path = p[0] === '/' ? p : prefix + p;

				const props: RouteComponentProps = {router: {path, children}};
				adjusted.push({...r, path: path, component: <InstanceComponent {...props}/>, children});
			}
			
			if (children && !r.handleChildren)
				adjusted.push(...children);
		}

		return adjusted;
	}
	

	/**
	 * Navigates using the react-router hook
	 * @param path Path to navigate (will be called .toString())
	 * @param replace if to replace the current url
	 * @param timeout setTimeout(goto, number), useful if calling in a hook example: componentDidMout()
	 */
	public static goto(path: string | {}, replace?: boolean, timeout?: boolean) {
		if (!RouterService.navigate)
			return;

		const p = (path || '').toString();

		// if navigating to the same page then reload
		if (p === this.getCurrentPath())
			return this.reloadPage();

		// we use setTimeout to support navigation on 'componentDidMount'
		if (timeout)
			setTimeout(() => RouterService.navigate(p, {replace}), 0);
		else
			RouterService.navigate(p, {replace});
	}

	/**
	 * Returns the matches
	 * @param props Props of the component to check
	 */
	public static match(props: RouteComponentProps): {[key: string]: string} {
		if (!props || !props.router || !props.router.path)
			return {};
			
		const m = matchPath(props.router.path, window.location.pathname);
		return m ? m.params : {};
	}

	/**
	 * Returns the current location path
	 */
	public static getCurrentPath() {
		return window.location.pathname;
	}

	/**
	 * reloads the current page by navigating to random gibberish as to keep the SPA state
	 */
	public static reloadPage() {
		const current = RouterService.getCurrentPath();
		RouterService.goto('/__rwa', true);
		setTimeout(() => RouterService.goto(current, true), 1);
	}
	
	/**
	 * Allows you to go back using a custom url history, one that doesnt contain query or hash
	 * if not present history, fallsback to the default back()
	 */
	public static back() {
		window.history.back();
	}

	state: RSState = { adjustedRoutes: [] };
	
	/**
	 * Returns the jsx to render the routes
	 * @param r The route to render
	 */
	private getRouteJsx(r: AdjustedRouteDeclaration): JSX.Element {
		if (r.handleChildren)
			return (
				<Route key={r.path} path={r.path} element={r.component}>
					{(r.children || []).map(c => this.getRouteJsx(c))}
				</Route>
			);

		return <Route key={r.path} path={r.path} element={r.component}/>;
	}

	render() {
		const WrapRoutes = this.props.asChildRouter ? Routes : RouterService.HookRoutes;
		return (
			<Router>
				<WrapRoutes>
					{this.state.adjustedRoutes.map(r => this.getRouteJsx(r))}
				</WrapRoutes>
			</Router>
		);
	}

}

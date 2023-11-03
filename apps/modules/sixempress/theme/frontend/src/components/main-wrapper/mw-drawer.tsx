import React from 'react';
import { RouterService } from '../../services/router/router-service';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Box from '@material-ui/core/Box';
import Divider from '@material-ui/core/Divider';
import Collapse from '@material-ui/core/Collapse';
import FiberManualRecord from '@material-ui/icons/FiberManualRecord';
import ExpandMore from '@material-ui/icons/ExpandMore';
import ExpandLess from '@material-ui/icons/ExpandLess';
import { NavLink } from "react-router-dom";
import { HtmlIds } from './html-ids.enum';
import { UiSettings } from '../../services/ui/ui-settings.service';
import { IAvailableRoute, MDProps, MDState } from './main-wrapper.dtd';
import { TouchActionUtils } from '@sixempress/utilities';

export class MwDrawer extends React.Component<MDProps, MDState> {

	constructor(p: MDProps) {
		super(p);
		this.state = { 
			open: p.initialOpen,
			sidebarVoices: this.getAvailableRoutes(p.sidebar)
		};
	}
	
	/**
	 * Returns the routes that the current user can use
	 * @param userRoles User level of the currently logged in user
	 */
	 public getAvailableRoutes(routes: IAvailableRoute[]): IAvailableRoute[]  {
		const toR: IAvailableRoute[] = [];

		const processedRoutes = routes;

		for (const route of processedRoutes) {
			if (!route)
				continue;

			// push the route in the return array
			let toAdd = route;

			// filter collections routes
			if (toAdd.type === 'collection') {
				// cloning the object to then reassing .data.items
				const toWork = {...toAdd};
				toWork.items = this.getAvailableRoutes(toWork.items);

				// TODO in case you add a link to the collection,
				// instead of removing the item, transform it into a simple link :D

				// dont add the item if the collection has no childs
				if (toWork.items.length === 0)
					continue;
					
				toAdd = toWork;
			}

			toR.push(toAdd);
		}
		
		return toR;

	}

	/**
	 * contains the references to all the dropdown menus so they can be closed when closing the menu
	 */
	private sidebarDropdownRefs: CollectionSideBar[] = [];

	/**
	 * Reference to the drawer element
	 */
	private drawer: HTMLElement;
	/**
	 * Reference to the main container element
	 */
	private main: HTMLElement;

	private openOnSwipe = TouchActionUtils.createSwipe({
		direction: () => this.state.open ? 'left' : 'right',
		ignoreEventFrom: ['[role="none presentation"]'],
		x: {
			minDistance: [70, 70],
			// startActionArea: [0, Infinity],
			startActionArea: (e) => {
				// if on a phone allow to close anywhere as its fixed
				if (UiSettings.lessMd())
					return [0, Infinity]

				return [0, 0];
				// // allow it to open from the left side
				// if (!this.state.open)
				// 	return [0, 100]

				// // else allow to close a bit further from the border
				// return [0, 300]
			},
		}
	}, {
		onStart: () => {
			this.drawer.style.transition = 'none';
			this.main.style.transition = 'none';
		},
		onSwiping: (e, s) => {
			const distance = e.pageX - s.x;
			if (distance > 0) {
				if (!this.state.open) {
					const i = 240;
					const sidebar = distance > i ? 0 : i - distance
					const main = distance > i ? i : distance
					// this.drawer.style.width = this.initialSidebarStyles.width + distance + 'px';
					this.drawer.style.transform = 'translateX(' + (-sidebar) + 'px';
					this.main.style.transform = 'translateX(' + (main) + 'px';
				}
			}
			else {
				if (this.state.open) {
					const i = 240;
					const sidebar = distance < -i ? -i : distance
					const main = distance < -i ? 0 : i + distance
					// this.drawer.style.width = this.initialSidebarStyles.width + distance + 'px';
					this.drawer.style.transform = 'translateX(' + (sidebar) + 'px';
					this.main.style.transform = 'translateX(' + (main) + 'px';
				}
			}
		},
		// restore sidebar style
		onEnd: (e, s, c) => {
			if (c)
				this.toggleDrawer(e.pageX - s.x > 0);

			this.drawer.style.width = null;
			this.drawer.style.transform = null;
			this.drawer.style.transition = null;

			this.main.style.width = null;
			this.main.style.transform = null;
			this.main.style.transition = null;
		},
	})

	private sidebarDropdownRefFn = (f) => {
		if (f && !this.sidebarDropdownRefs.includes(f)) {
			this.sidebarDropdownRefs.push(f);
		}
	}

	/**
	 * Ensures the drawer is open when we click on a dropdown
	 */
	private onAfterOpen = () => {
		this.toggleDrawer(true);
	}

	/**
	 * Add the swipe listeners
	 */
	componentDidMount() {
		window.addEventListener('touchmove', this.openOnSwipe.onTouchMove);
		window.addEventListener('touchend', this.openOnSwipe.onTouchEnd);
		this.drawer = document.getElementById(HtmlIds.navigationDrawer);
		this.main = document.getElementById(HtmlIds.mwMain);
	}

	componentWillUnmount() {
		window.removeEventListener('touchmove', this.openOnSwipe.onTouchMove);
		window.removeEventListener('touchend', this.openOnSwipe.onTouchEnd);
	}

	/**
	 * Closes the drawer if the drawer is open and the user clicks away from the drawer
	 */
	protected closeByClickAway = (e?: any) => {
		this.toggleDrawer(false);
	}

	/**
	 * Opens/closes the drawer by a paremeter
	 */
	public toggleDrawer(toOpen?: boolean) {
		if (typeof toOpen === 'undefined')
			toOpen = !this.state.open;

		if (this.state.open === toOpen)
			return;

		// close all the dropdowns
		if (!toOpen)
			for (const d of this.sidebarDropdownRefs)
				d.setState({open: false});

		this.setState(
			{open: toOpen},
			() => {
				// we trigger manually resize for internal components
				// for example the autosize in the movemnets table etc
				// genrally its good to resize for component that depend on available parent size
				if (UiSettings.moreMd())
					setTimeout(
						() => window.dispatchEvent(new Event('resize')),
						UiSettings.contentTheme.transitions.duration.enteringScreen
					);

				if (this.props.onToggle)
					this.props.onToggle(this.state.open);
			}
		);
		
	}

	/**
	 * Navigates the application with a delay if the user is using a mobile (the delay is for smoother transition)
	 * The delayed navigation helps as the animation seems more fluid
	 * if the user is from mobile it also closes the drawer
	 * @param to The route to navgate to
	 */
	protected navigateTo = (e: React.MouseEvent<any>) => {
		e.preventDefault();

		const current = RouterService.getCurrentPath();
		const to = e.currentTarget.dataset.to;

		// if the path starts with the same route, then ensure that the whole tree is reloaded
		// this is to prevent stuff like "path/:param" freezing
		//
		// if i navigate to path/1, and then i navigate to path/2
		// the component won't realod, because it's not unmounted
		// this ensures the component is unmounted and remounted
		// 
		// it triggers only on the sidebar click, so not a big deal on navigation performance
		const reloadTheComponent = current.split("/")[1] === to.split('/')[1];

		if (reloadTheComponent) {
			RouterService.goto('/__rwa', true);
		}
		
		if (UiSettings.lessMd()) {
			this.toggleDrawer(false);
			// and back we go
			setTimeout(() => RouterService.goto(to, reloadTheComponent), UiSettings.contentTheme.transitions.duration.leavingScreen + 40);
		}
		else {
			// we use set timeout here to allow the reloadTheComponent above action to take effect
			setTimeout(() => RouterService.goto(to, reloadTheComponent), 0);
		}

	}

	/**
	 * Returns the component to show on the sidebar
	 * @param route The current route of which return the component
	 * @param idx The index of the iterated route
	 * @param dropdownNest is used for the nested menus the hight the number the higher the indent
	 */
	private generateSidebarComponent(route: IAvailableRoute, idx: number, dropdownNest: number = 0): JSX.Element | JSX.Element[] {

		const getIcon = (icon?: any) => {
			const JsxIcon = icon || (dropdownNest === 0 ? FiberManualRecord : null);
			if (JsxIcon)
				return <ListItemIcon><JsxIcon/></ListItemIcon>;
		};

		switch (route.type) {

			// normal link
			case 'route':
				return (
					<NavLink 
						key={route.routeLink + idx + dropdownNest} 
						onClick={this.navigateTo} 
						to={'/' + route.routeLink} 
						data-to={'/' + route.routeLink}
						className={({ isActive }) => isActive ? 'activeLink' : ''}
					>
						<ListItem 
							button 
							className='drawer-link'
							style={dropdownNest ? {paddingLeft: UiSettings.contentTheme.spacing(2 + dropdownNest)} : undefined}
						>
							{getIcon(route.icon)}	
							<ListItemText primary={route.label} color='primary'/>
						</ListItem>
					</NavLink>
				);

			// divider
			case 'divider':
				return (
					<Box key={'divider' + idx + dropdownNest} my={1}>
						<Divider/>
					</Box>
				);

			// collection
			case 'collection':

				const childs = route.items.map((nestedRoute, index) => this.generateSidebarComponent(nestedRoute, index, dropdownNest + 1));
				return (
					<React.Fragment key={idx + route.label + childs.length} >
						<CollectionSideBar
							icon={getIcon(route.icon)}
							label={route.label}
							onAfterOpen={this.onAfterOpen}
							nestedLevel={dropdownNest}
							ref={this.sidebarDropdownRefFn}
						>
							{childs}
						</CollectionSideBar>
					</React.Fragment>
				);

		}
	}


	private toggleDrawerByClickAway = () => {
		this.toggleDrawer(false);
	}

	render() {
		return (
			<>
				{/* Clickaway handler for the sidebar when it's open on a phone */}
				<Box id='drawerClickAwayDiv' zIndex={this.state.open ? 3 : -1} onClick={this.toggleDrawerByClickAway}/>
				<div id={HtmlIds.navigationDrawer} className={this.state.open ? 'open' : 'closed'}>
					<List>
						{this.state.sidebarVoices.map((route, index) => this.generateSidebarComponent(route, index))}
					</List>
				</div>
			</>
		);
	}


}

interface CSDState {
	open: boolean;
}
class CollectionSideBar extends React.Component<{nestedLevel: number, icon: any, label: any, children: any, onAfterOpen: () => void}, CSDState> {

	state: CSDState = {open: false};
	
	private toggle = () => {
		if (this.state.open) {
			this.setState({open: false});
		} else {
			this.setState({open: true});
			this.props.onAfterOpen();
		}
	}

	render() {
		return (
			<>
				<ListItem 
					button 
					className='drawer-link'
					onClick={this.toggle} 
					style={this.props.nestedLevel 
						? {paddingLeft: UiSettings.contentTheme.spacing(2 + this.props.nestedLevel)} 
						: undefined
					}
				>
					{this.props.icon}	
					<ListItemText primary={this.props.label}/>
					{this.state.open ? <ExpandLess/> : <ExpandMore/> }
				</ListItem>
	
				<Collapse in={this.state.open} timeout="auto">
					<List component="div">{this.props.children}</List>
				</Collapse>
			</>
		);
	}

}
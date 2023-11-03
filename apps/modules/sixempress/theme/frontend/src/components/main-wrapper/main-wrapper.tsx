import "./main-wrapper.css";
import React from 'react';
import Badge from '@material-ui/core/Badge';
import Paper from '@material-ui/core/Paper';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import MenuIcon from '@material-ui/icons/Menu';
import Box from '@material-ui/core/Box';
import IconButton from '@material-ui/core/IconButton';
import Divider from '@material-ui/core/Divider';
import MoreVert from '@material-ui/icons/MoreVert';
import ExitToApp from '@material-ui/icons/ExitToApp';
import Settings from '@material-ui/icons/Settings';
import Tooltip from '@material-ui/core/Tooltip';
import { HtmlIds } from './html-ids.enum';
import Button from '@material-ui/core/Button';
import Popover from '@material-ui/core/Popover';
import Switch from '@material-ui/core/Switch';
import { UiSettings } from '../../services/ui/ui-settings.service';
import { MwDrawer } from "./mw-drawer";
import { RouterService } from "../../services/router/router-service";
// import { TutorialService } from "../../services/tutorial/tutorial.service";
import { Outlet } from 'react-router-dom';
import { NotificationsService } from "../../services/notifications/notifications.service";
import { NotificationsStack } from "../notifications/notifications-stack";
import { IAvailableRoute } from "./main-wrapper.dtd";
import { UiMenuActionButton } from "../../types/hooks";

export interface IWMState {
	settingPopover: null | HTMLElement,
	colorScheme: "dark" | 'light',
	notfs: number,
	menuActionButtons: UiMenuActionButton[],
}

export interface IWMProps {
	username?: string,
	sidebar: IAvailableRoute[],
	onLogout: () => void,
}

export class MainWrapper extends React.Component<IWMProps, IWMState> {


	private mwDrawerRef = React.createRef<MwDrawer>();
	
	private handlers = {
		onNotificationUpdate: () => {
			this.setState({notfs: NotificationsService.notifications.length});
		},
		onCloseNotf: (e: React.MouseEvent<any>) => {
			const id = e.currentTarget.dataset.id;
			NotificationsService.removeNotification(id);
		},
		onClickLogout: () => {
			this.props.onLogout();
		},
		onClickDrawer: () => {
			this.mwDrawerRef.current.toggleDrawer();
		},
		onClickToggleSettingsPopover: (e?: React.MouseEvent<any>) => {
			this.setState({settingPopover: this.state.settingPopover || !e ? null : e.currentTarget});
		},
		onClickToggleColors: () => {
			UiSettings.colorsTheme = UiSettings.colorsTheme === 'dark' ? 'light' : 'dark';
			this.setState({colorScheme: UiSettings.colorsTheme});
		},
		onClickGotoSettings: () => {
			RouterService.goto('/system-settings');
		},
	}

	state: IWMState = { 
		settingPopover: null,
		colorScheme: UiSettings.colorsTheme,
		notfs: 0,
		menuActionButtons: use_filter.sxmp_theme_ui_menu_action_buttons([
			{title: 'Controllo Sistema', onClick: this.handlers.onClickGotoSettings, icon: <Settings/>},
			{title: 'Logout', onClick: this.handlers.onClickLogout, icon: <ExitToApp/>},
		]).map(i => ({...i, onClick: (...args) => (this.setState({settingPopover: null}), i.onClick(...args))})),
	};


	componentDidMount() {
		this.handlers.onNotificationUpdate();
		NotificationsService.notificationsUpdate.registerAction(this.handlers.onNotificationUpdate);
	}
	componentWillUnmount() {
		NotificationsService.notificationsUpdate.removeAction(this.handlers.onNotificationUpdate);
	}


	render() {
		return (
			<>
				{this.getTopLevelJSX()}
				<div id='mw-topbar'>
					<div>
						<Toolbar variant="dense">
							<IconButton onClick={this.handlers.onClickDrawer} edge="start" className='menuButton'>
								<MenuIcon/>
							</IconButton>
							<div onClick={this.handlers.onClickDrawer} className='menu-btn-text-container'>
								<Typography align='left' variant="body1" color='inherit'>
									Menu
								</Typography>
							</div>
							<Typography align='center' variant="h6" noWrap style={{width: '100%'}}>
								<React_use_hook ruhName='sxmp_main_wrapper_topbar_center_content'/>
							</Typography>
							<Box flexShrink={0}>
								<Tooltip title='Menu'>
									<Badge color="error" badgeContent={this.state.notfs} className='mui-notfs-badge' overlap='circle' anchorOrigin={{vertical: 'top', horizontal: 'left',}}>
										<IconButton edge='end' onClick={this.handlers.onClickToggleSettingsPopover}>
											<MoreVert/>
										</IconButton>
									</Badge>
								</Tooltip>
							</Box>
						</Toolbar>
					</div>
				</div>


				<div id='mw-container'>
					<MwDrawer ref={this.mwDrawerRef} initialOpen={false} sidebar={this.props.sidebar}/>
					<div id={HtmlIds.mwMain}>
						<main id={HtmlIds.mainContainer}>
							<Outlet/>
						</main>
					</div>
				</div>
			</>
		);
	}

	private getTopLevelJSX() {
		return (
			<>
				<Popover
					anchorEl={this.state.settingPopover}
					open={Boolean(this.state.settingPopover)}
					onClose={this.handlers.onClickToggleSettingsPopover}
					anchorOrigin={{ vertical: 'top', horizontal: 'right', }}
					transformOrigin={{ vertical: 'top', horizontal: 'right', }}
					className='mw-menu-main-popover'
				>
					<NotificationsStack onCloseMenu={this.handlers.onClickToggleSettingsPopover}/>
					<Paper>
						<Box px={2} py={1}>
							<table className='mw-menu-switch-table'><tbody>
								<tr>
									<td>
										<Button onClick={this.handlers.onClickToggleColors}>TEMA SCURO</Button>
									</td>
									<td>
										<Switch
											checked={this.state.colorScheme === 'dark' ? true : false}
											onChange={this.handlers.onClickToggleColors}
										/>
									</td>
								</tr>
								{/* <tr>
									<td>Suggerimenti</td>
									<td>
										<Switch
											checked={this.state.tutorialEnabled}
											onChange={this.handlers.onClickToggleTutorial}
										/>
									</td>
								</tr> */}
								{/* {ContextService.environment.libSetup && (ContextService.environment.libSetup.menuVoices || []).map((v, idx) => (
									<tr key={'' + idx}>
										<td colSpan={2}>
											<Button onClick={(e) => (this.handlers.onClickToggleSettingsPopover(e), v.onClick(e))}>{v.title}</Button>
										</td>
									</tr>
								))} */}
							</tbody></table>
						</Box>
						{this.props.username && (
							<Box my={1} textAlign='center'>
								<i>{this.props.username}</i>
							</Box>
						)}
						<Divider/>
						<Box display='flex' justifyContent='space-around' px={2} py={1}>
							{this.state.menuActionButtons.map(btn => (
								<Tooltip title={btn.title}>
									<IconButton color='inherit' onClick={btn.onClick}>
										{btn.icon}
									</IconButton>
								</Tooltip>
							))}
						</Box>
					</Paper>

					{/* {(ContextService.environment.environment === 'local') && <ErrorAddon/>} */}
				</Popover>
			</>
		)
	}

}

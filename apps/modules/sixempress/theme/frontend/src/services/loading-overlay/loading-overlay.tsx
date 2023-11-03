import React, { CSSProperties } from 'react';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import CircularProgress from '@material-ui/core/CircularProgress';

interface LOState {
	/**
	 * This is a buffer with all the request to activate the loader
	 *
	 * When you do loading = true then an element will be added here
	 * when you do loading = false, an element is removed
	 *
	 * the buffer is present so that if you make multiple request to active the loader
	 * if one of the requests toggles it to false, it dont have to toggle every other loader too
	 * 
	 * The overlay stays till there is at least 1 element in the array
	 */
	processes: 1[],

	/**
	 * As we debounce the loader a bit to not have it pop up everytime
	 * we need a flag to know when to show the loader
	 */
	showLoader: boolean,
}

interface LOProps {
	status?: boolean
}

export class LoadingOverlay extends React.Component<LOProps, LOState> {

	/**
	 * The time after we show the loader
	 */
	private static LOADING_START_TIMEOUT_MS = 250;

	/**
	 * The jsx instance being used in the app
	 */
	private static jsxInstance?: LoadingOverlay;

	public static get loading(): boolean {
		if (!LoadingOverlay.jsxInstance)
			return false;
		return LoadingOverlay.jsxInstance.state.processes.length !== 0;
	}
	public static set loading(val: boolean) {
		if (!LoadingOverlay.jsxInstance)
			return;
		LoadingOverlay.jsxInstance.updateProcesses(val);
	}

	/**
	 * The text for the loading overlay (CURRENTLY NOT IMPLEMENTED)
	 */
	public static text: string = '';

	/**
	 * Changes the loading state and lets the ui reload
	 * 
	 * Useful for when doing complex sync tasks as normal "loading = true" won't work
	 */
	public static async loadingAsync(state: boolean) {
		LoadingOverlay.loading = state;
		await new Promise(r => setTimeout(r, 1));
	}

	/**
	 * Removes all the loading stack
	 */
	public static clearLoading() {
		if (!LoadingOverlay.jsxInstance)
			return;
		LoadingOverlay.jsxInstance.clearLoading();
	}

	private static styles = {
		mainBox: {
			top: 0,
			left: 0,
			width: '100vw', 
			height: '100vh', 
			position: 'fixed', 
			zIndex: 10_000_000,
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center',
			transitionDuration: '400ms',
		} as CSSProperties,
		paper: {
			borderRadius: '10000em',
			padding: '9px',
			height: '60px',
			width: '60px',
			boxShadow: '0 0 50px 0 rgba(0,0,0,0.25)',
		} as CSSProperties,
		icon: {
			width: '100%',
			height: '100%',
		} as CSSProperties,
	};


	constructor(p) {
		super(p);
		LoadingOverlay.jsxInstance = this;
	}

	private showLoaderTimeout!: NodeJS.Timeout;

	state: LOState = {
		processes: [],
		showLoader: false,
	}

	private updateProcesses(addOrRemove: boolean) {
		this.setState(s => {
			const arr = [...s.processes];
			if (addOrRemove)
				arr.push(1);
			else
				arr.pop();
				
			return {processes: arr};
		});
	}

	private clearLoading() {
		this.setState({processes: []});
	}

	componentDidUpdate(prevProps: {}, prevState: LOState) {
		// if we added a process start the timer
		if (!prevState.processes.length && this.state.processes.length) {
			clearTimeout(this.showLoaderTimeout);
			this.showLoaderTimeout = setTimeout(() => this.setState({showLoader: true}), LoadingOverlay.LOADING_START_TIMEOUT_MS);
		}
		// if we removed all the processes then we hide the loader
		else if(prevState.processes.length && !this.state.processes.length) {
			clearTimeout(this.showLoaderTimeout);
			this.setState({showLoader: false});
		}
	}

	render() {
		// no loading request so we show null
		if (!this.state.processes.length && !this.props.status)
			return null;

		// else we show a box that blocks clicks (to not click when a load is happenning)
		// and we toggle the opacity based on the showProcess flag
		return (
			<Box style={this.state.showLoader || this.props.status ? {...LoadingOverlay.styles.mainBox, opacity: 1} : LoadingOverlay.styles.mainBox}>
				<Paper style={LoadingOverlay.styles.paper}>
					<CircularProgress style={LoadingOverlay.styles.icon}/>
				</Paper>
			</Box>
		)
	}

}

import React from 'react';
import { Subject, Subscription } from "rxjs";
import Snackbar, { SnackbarProps, SnackbarCloseReason } from '@material-ui/core/Snackbar';
import { SSState, ComplexSnackbarServiceProps, SimpleSnackbarServiceProps, OpenTrigger, StateChangeRequest, SnackbarControl } from './snackbar.dtd';
import Alert, { AlertProps } from '@material-ui/lab/Alert';
import Box from '@material-ui/core/Box';
import { UiSettings } from '../ui/ui-settings.service';
import IconButton from '@material-ui/core/IconButton';
import Close from '@material-ui/icons/Close';
import { Slide, SlideProps } from '@material-ui/core';
import { TransitionProps } from '@material-ui/core/transitions/transition';


/**
 * This service has to be rendered in a top level place to generate the JSX
 * <SnackbarService/>
 */
export class SnackbarService extends React.Component<{}, SSState> {

	/**
	 * Returns a transition object that SLIDES
	 */
	public static getSlideTransition = (props?: Partial<SlideProps>) =>
		React.forwardRef<unknown, TransitionProps>(
			function Transition(p, ref) {
				return <Slide direction="up" ref={ref} {...p} {...props as any} />;
			}
		)
 

	/**
	 * The time after the animation is over
	 */
	public static CLOSE_TIMEOUT: number = UiSettings.contentTheme.transitions.duration.leavingScreen;
	public static AUTOHIDE_TIME: number = 3000;

	// these values are temporary as notistack is not gud i dont remember why but it had to do with the final bundle or shomething
	private static SNACK_HEIGHT: number = 48;
	private static SNACK_BOTTOM_PAD: number = 24;

	/**
	 * Opens a snackbar in the app
	 * @param message The message of the snack
	 * @param opts The options of the snack
	 */
	public static openSimpleSnack(message: string, opts: SimpleSnackbarServiceProps = {}): SnackbarControl {
		opts.message = message;
		const key = Math.random().toString();
		SnackbarService.trigger.next({action: 'open', key, config: {type: 'simple', variant: opts.variant, opts: opts as unknown as SnackbarProps}});
		return {
			close: (reason?: string) => SnackbarService.trigger.next({action: 'close', key, reason}),
		};
	}

	/**
	 * Opens a snackbar where you specify the content manually of the snackbar
	 */
	public static openComplexSnack(content: JSX.Element, opts: ComplexSnackbarServiceProps = {} as any): SnackbarControl {
		const key = Math.random().toString();
		SnackbarService.trigger.next({action: 'open', key, config: {type: 'complex', content, opts: opts as unknown as SnackbarProps}});
		return {
			close: (reason?: string) => SnackbarService.trigger.next({action: 'close', key, reason}),
		};
	}

	/**
	 * Closes all snaccs instantly
	 */
	public static dismissAll() {
		SnackbarService.trigger.next({action: "dismissAll"});
	}


	// static method to instance "adaptor" (what are these terms)
	private static trigger = new Subject<StateChangeRequest>();
	private static sub: Subscription;
	constructor(props) {
		super(props);
		if (SnackbarService.sub) { SnackbarService.sub.unsubscribe(); SnackbarService.sub = undefined; }
		SnackbarService.sub = SnackbarService.trigger.subscribe(res => this.requestStateChange(res));
	}

	
	state: SSState = {
		orderedKeys: [],
		openedSnacks: {},
	};


	/**
	 * handles the static methods requests
	 */
	private requestStateChange(r: StateChangeRequest) {
		switch (r.action) {
			case 'open': return this.addSnack(r.key, r.config);
			case 'close': return this.closeSnackbar(r.key, r.reason as any);
			case 'dismissAll': return this.dismissAll();
		}
	}


	private dismissAll() {
		this.setState({openedSnacks: {}, orderedKeys: []});
	}

	/**
	 * Transforms the external config, to the internal snackbarprops and sets it
	 */
	private addSnack(key: string, request: OpenTrigger) {
		this.setState(s => {
			const rOpts: SimpleSnackbarServiceProps | ComplexSnackbarServiceProps = request.opts || {} as any;

			// add some base default quacks
			request.opts = {
				open: true, 
				TransitionComponent: SnackbarService.getSlideTransition({direction: 'left'}),
				autoHideDuration: SnackbarService.AUTOHIDE_TIME,
				anchorOrigin: {
					vertical: 'bottom',
					horizontal: 'left',
				},
				// add given opts
				...rOpts,
				// override the onclose to trigger the closing later
				onClose: rOpts.onClose 
					? (e, r) => this.closeSnackbar(key, r) && rOpts.onClose(r)
					: (e, r) => this.closeSnackbar(key, r),
			};

			const khm = {...s.openedSnacks};
			const arr = [...s.orderedKeys];

			khm[key] = request;
			arr.push(key);

			return {openedSnacks: khm, orderedKeys: arr};
		});
	}


	/**
	 * Sets the snackbar open state to closed, and then after the exit animation,
	 * removes the snackbar completely
	 * @returns a boolean if the snackbar was closed or not
	 */
	private closeSnackbar(key: string, reason?: SnackbarCloseReason): boolean {
		if (reason === 'clickaway' || !this.state.openedSnacks[key]) {
			return false;
		}

		// animate the exit
		this.setState(s => {
			// check if present
			if (!s.openedSnacks[key]) { return; }

			const khm = {...s.openedSnacks};
			khm[key].opts.open = false;

			return {openedSnacks: khm};
		}, () => {
			// after the animation of exiting is over, we remove completely the snacc
			setTimeout(() => {
				this.setState(s => {
					// no key so return
					if (!s.openedSnacks[key]) { return; }

					// delete completely
					const khm = {...s.openedSnacks};
					const arr = [...s.orderedKeys];
					
					delete khm[key];
					const idx = arr.indexOf(key);
					if (idx !== -1) { arr.splice(idx, 1); }
	
					return {openedSnacks: khm, orderedKeys: arr};
				});
			}, SnackbarService.CLOSE_TIMEOUT); 
		});

		return true;
	}


	private onClickCloseSnack = (e: React.MouseEvent<any>) => {
		const key = e.currentTarget.dataset.snackKey;
		this.closeSnackbar(key);
	}

	render() {
		if (this.state.orderedKeys.length === 0) { return (null); }

		return (
			<>
				{this.state.orderedKeys.map((k, idx) => {

					const snacc = this.state.openedSnacks[k];
					
					// no snackk
					if (!snacc) { 
						return (null); 
					}

					// offset to show other snaccs
					const styleToUse = snacc.opts.style
						? { ...snacc.opts.style, bottom: (SnackbarService.SNACK_BOTTOM_PAD + (SnackbarService.SNACK_BOTTOM_PAD + SnackbarService.SNACK_HEIGHT) * idx) + "px" }
						: { bottom: (SnackbarService.SNACK_BOTTOM_PAD + (SnackbarService.SNACK_BOTTOM_PAD + SnackbarService.SNACK_HEIGHT) * idx) + "px" };

					// add always a close handler cause oh yea
					const closeButton = (
						<IconButton size='small' color='inherit' data-snack-key={k} onClick={this.onClickCloseSnack}>
							<Close/>
						</IconButton>
					);
					const action = snacc.opts.action 
						? (<>{snacc.opts.action}{closeButton}</>)
						: closeButton;

					// complex
					if (snacc.type === 'complex') {
						return ( <Snackbar key={k} {...snacc.opts} style={styleToUse} action={action}>{snacc.content}</Snackbar> );
					}
					
					// set the background with the variant
					if (snacc.variant) {
						return ( <Snackbar key={k} {...snacc.opts} style={styleToUse} action={action}>{this.getAlertJsx({severity: snacc.variant}, snacc.opts.message, action)}</Snackbar> );
					}

					// empty snacc
					return ( <Snackbar key={k} {...snacc.opts} style={styleToUse} action={action}/> );
				})}
			</>
		);

	}

	/**
	 * Alert with differnt variants for the snackbar
	 */
	private getAlertJsx(props: AlertProps, message: React.ReactNode, content?: React.ReactNode) {
		if (content) {
			return (
				<Alert severity="info" variant='filled' style={{alignItems: 'center'}} {...(props || {})}>
					<Box display='flex' alignItems='center'>
						{message}
						<Box ml="3em">
							{content}
						</Box>
					</Box>
				</Alert>
			);
		}
		else {
			return (
				<Alert severity="info" variant='filled' {...(props || {})}>
					{message}
				</Alert>
			);
		}
	}

}

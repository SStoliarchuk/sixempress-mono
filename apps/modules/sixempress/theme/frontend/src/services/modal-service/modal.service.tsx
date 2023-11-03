import './modal.service.css';
import React, { ComponentClass, ComponentType } from 'react';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import Close from '@material-ui/icons/Close';
import type { PropsToPass, ComponentToOpen, ModalProps, OpenModalControls, MSState, ModalComponentProps, MSProps, StateModal } from './modal.service.dtd';
// import { FixedHeaderDialog as ResponsiveDialog } from './dialog-types/fixed-header.dialog';
import { FullScrollDialog as ResponsiveDialog } from './dialog-types/full-scroll.dialog';
import { ActionRegister } from '@sixempress/utilities';


/**
 * This is a private class containing the base logic for the modals to open and close
 */
export class ModalService extends React.Component<MSProps, MSState> {

	/**
	 * Emits each time a modal has been added or removed from the state
	 */
	public static onModalsChange = new ActionRegister();

	private static CHARS_LIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	/**
	 * The default values of the props
	 */
	protected static defaultStaticProps: {[A in keyof MSProps]: MSProps[A]} = {
		TRANSITION_MS: 200,
	};

	/**
	 * The time it takes for the close animation to complete
	 */
	public static TRANSITION_MS: number | false;

	/**
	 * A static reference assigned in the constructor of this function
	 * used to:
	 * - Ensure that only 1 instance is running
	 * - Call instance functions to operate on the state
	 */
	protected static currentModalServiceInstance: ModalService;
	
	/**
	 * Allows you to open a modal :]
	 * @param c The component to open
	 * @param componentProps The props to pass to the component to open
	 * @param modalProps the props to pass to the modal opened
	 * @param modalComponent allows you to use a custom modal component instead of the default one
	 */
	public static open<C extends ComponentType<any>> (
		c: ComponentToOpen<C>, 
		componentProps: PropsToPass<C> = {} as any,
		modalProps: ModalProps = {},
		modalComponent?: ComponentType<any>,
	): OpenModalControls<C> {
		if (!ModalService.currentModalServiceInstance)
			return;

		return ModalService.currentModalServiceInstance.open(c, componentProps as PropsToPass<C>, modalProps, modalComponent);
	}

	/**
	 * Closes gracefully all the modals
	 * @param data optional data to pass
	 */
	public static closeAll(data?: any) {
		if (!ModalService.currentModalServiceInstance)
			return;

		for (const k of ModalService.currentModalServiceInstance.state.keys)
			ModalService.currentModalServiceInstance.close(k, data);
	}

	/**
	 * Sets/removes a attriubte on the html tag so that css properties for other things can be applied
	 * @param openedModalsPresent the amount of opened modals
	 */
	protected static updateHtmlCssAttribute(openedModalsPresent: StateModal<any>[]) {
		// if (openedModalsPresent.length)
		// 	document.querySelector('html').setAttribute('modals', openedModalsPresent.length.toString());
		// else
		// 	document.querySelector('html').removeAttribute('modals');

		// set the graphically opened/closed ones
		const open = openedModalsPresent.filter(o => o.open).length;
		if (open)
			document.querySelector('html').setAttribute('modals-opened', open.toString());
		else 
			document.querySelector('html').removeAttribute('modals-opened');
	}

	// /**
	//  * Each time the props change we need to update the static properties and reset the listeners and state
	//  * TODO add this ? 
	//  * i dont think we will ever change props
	//  */
	// static getDerivedStateFromProps(props: MSProps, state: MSState): MSState {
	// 	return ModalsServiceBase.start(props, state);
  // }
	
	/**
	 * Allows you to set/update the windows listener based on the new properties of the state
	 */
	protected static setWindowsListener() {
		// remove old and set new
		ModalService.clearWindowsListener();
		window.addEventListener('popstate', this.onChangeUrlCloseAll);
	}

	/**
	 * removes all the windows listener for state change
	 */
	protected static clearWindowsListener() {
		window.removeEventListener('popstate', this.onChangeUrlCloseAll);
	}

	/**
	 * this function is the callback for popstate and it closes all the modals
	 * it is used in case we dont use any URL_KEY method as firefox doesnt close modals on back button
	 */
	private static onChangeUrlCloseAll() {
		ModalService.closeAll();
	}


	/**
	 * Ensure singleton
	 */
	constructor(p: MSProps) { 
		super(p);
		this.state = this.start(p);
		ModalService.currentModalServiceInstance = this;
	}

		/**
	 * Sets the default values, emtpies other stuff and returns the starting state
	 * 
	 * we use this. in this function to allow overriding it
	 */
	protected start(props: MSProps, state?: MSState): MSState {

		const ks = Object.keys((this.constructor as typeof ModalService).defaultStaticProps) as (keyof MSProps)[];
		let propsChanged = false;
		
		for (const k of ks) {
			const val = typeof props[k] === 'undefined' ? (this.constructor as typeof ModalService).defaultStaticProps[k] : props[k];
			
			// if given check if different from current
			if (this.constructor[k] !== val) {
				propsChanged = true;
				this.constructor[k] = val;
			}
		}

		// genrate new component
		if (!state || propsChanged) {
			ModalService.setWindowsListener();
			return {keys: [], ordered: []}
		}
		// return old
		else {
			return state;
		}
	}

	componentWillUnmount() {
		ModalService.clearWindowsListener();
	}

	componentDidUpdate(pp: MSProps, ps: MSState) {
		if (ps.keys.length !== this.state.keys.length) {
			// emit on modals change for external listeners
			ModalService.onModalsChange.emit();
		}
		
		// update css of the html
		// we pass the opened instead of the present in state so that the close animation can begin
		// with in sync with the html animation
		ModalService.updateHtmlCssAttribute(this.state.ordered);
	}	

	/**
	 * Generates a unique key for the modal to open, and adds it to the URL so that the modal can be closed by nav back
	 * it uses random chars to ensure there is no race condition between two modals
	 */
	protected generateModalKey(): string {
		// add two random chars to ensure each key is ""unique""
		const src = ModalService.CHARS_LIST;
		const two = src.charAt(Math.floor(Math.random() * src.length)) + src.charAt(Math.floor(Math.random() * src.length));

		// find the smallest number not used
		// we use numbers as to keep the url as short as possible
		let k = 0;
		while (this.state.keys.includes(k.toString())) k++;

		return k + two;
	}

	/**
	 * Trasforms the users modal object into a state object modal
	 */
	protected open<C extends ComponentType>(c: ComponentToOpen<C>, componentProps: PropsToPass<C> = {} as PropsToPass<C>, modalProps: ModalProps = {}, modalComponent?: ComponentType): OpenModalControls<C> {
		
		const key = this.generateModalKey();

		// generate controls for the modal
		const modalControls: OpenModalControls<ComponentClass<any>> = {
			close: (d) => {
				this.close(key, d);
			},
			onRef: (fn) => {
				// ref already present in state
				const m = this.state.ordered.find(o => o.key === key && o.ref);
				if (m)
					return fn(m.ref);

				// add an action register for ref element
				this.setState(s => {
					const o = [...s.ordered];
					const m = o.find(om => om.key === key);
					if (!m)
						return;
					
					// register action
					if (!m.onRefActions)
						m.onRefActions = new ActionRegister();
					m.onRefActions.registerAction(fn);

					return {ordered: o};
				});
			},
		} as OpenModalControls<ComponentClass<any>>;

		
		// assign controles and generatioe component
		(componentProps as ModalComponentProps).modalRef = {
			...modalControls,
			onClickClose: () => modalControls.close()
		};
		const component = this.resolveComponentToOpen(key, c, componentProps, modalProps);

		// update state
		this.setState(s => {
			const ks = [...s.keys];
			const o = [...s.ordered];
			ks.push(key);
			o.push({
				open: true, 
				key, 
				component, 
				modalProps: {...modalProps, manualClose: modalControls.close},
				modalComponent
			});

			return {keys: ks, ordered: o}
		});

		// return controls
		return modalControls as OpenModalControls<ComponentClass<any>> as any as OpenModalControls<C>
	}


	/**
	 * Animates the closing of the modal, and then calls the function to remove it from state
	 * @param key the key of the modal to close
	 * @param data The data to pass to the closing function
	 */
	protected close(key: string, data?: any) {

		// quick closing for tests
		if (!ModalService.TRANSITION_MS)
			return this.removeModalFromState(key, data);


		this.setState(
			s => {
				const o = [...s.ordered];
				
				// close ui modal
				const modal = o.find(m => m.key === key);
				if (!modal)
					return;

				modal.open = false;

				return {ordered: o};
			},
			// once we close ui modal, we set a timeout to remove the item
			() => {
				setTimeout(
					() => this.removeModalFromState(key, data),
					ModalService.TRANSITION_MS as number
				);
			}
		);

	}

	/**
	 * Removes a modal from state data
	 * this function is out here to allow immediate closing with leaving_screen_time = false
	 * for easier jest tests
	 * @param key Modal key to remove
	 * @param data Data to pass onClose() callback
	 */
	protected removeModalFromState(key: string, data?: any) {
		this.setState(
			s => {
				const ks = [...s.keys];
				const o = [...s.ordered];

				if (ks.includes(key))
					ks.splice(ks.indexOf(key), 1);

				const idx = o.findIndex(m => m.key === key)
				if (idx !== -1) {
					this.emitOnClosed(o[idx].modalProps.onClosed, data);
					o.splice(idx, 1);
				}
					
				return {keys: ks, ordered: o};
			},
		);
	}

	/**
	 * This function exists so that ic an be overridden
	 * @param fn Function to call
	 * @param data argumento for the function
	 */
	protected emitOnClosed(fn?: ModalProps['onClosed'], data?: any) {
		if (fn)
			fn(data);
	}

	/**
	 * Trasforms the component instruction from the user to a JSX supported format
	 * @param c The component passed by the user
	 */
	protected resolveComponentToOpen<C extends ComponentType>(key: string, c: ComponentToOpen<C>, props: PropsToPass<C>, modalProps: ModalProps) {

		// add paper to the title if the body has been removed
		const TitleContainer = modalProps.removePaper ? Paper : DialogTitle;
		const InnerTitleContainer = modalProps.removePaper ? DialogTitle : React.Fragment;

		return typeof c !== 'object' 
			// simple function or class
			? this.resolveJsxSupported(key, c, props) 

			// construct object dialog
			: (
				<>
					<TitleContainer className={modalProps.removePaper ? 'modal-service-title' : ''}>
						<InnerTitleContainer>
							<IconButton edge='start' data-key={key} onClick={this.onClickDialogClose}>
								<Close/>
							</IconButton>
							{c.title 
								? this.resolveJsxSupported(key, c.title) 
								: 'Chiudi'
							}
						</InnerTitleContainer>
					</TitleContainer>


					<DialogContent className={modalProps.removePaper ? 'p-0' : ''}>
						{this.resolveJsxSupported(key, c.content, props)}
					</DialogContent>

					{(c.actions || !modalProps.removePaper) && (
						<DialogActions>
							{c.actions && this.resolveJsxSupported(key, c.actions)}
						</DialogActions>
					)}
				</>
			);
	}


	/**
	 * resolve a supported type
	 * @param C The "component" to resolve
	 * @param props the props in case the component is a react component
	 */
	protected resolveJsxSupported<C extends ComponentType>(key: string, C: ComponentToOpen<any>, props: PropsToPass<C> = {} as PropsToPass<C>) {

		// give ref if a class
		if ((C as ComponentClass).prototype && (C as ComponentClass).prototype.render)
			return <C {...props} data-modal-service-key={key} ref={this.onClassRef}/>;

		if (typeof C  === 'function')
			return <C {...props}/>;

		return C;
	}

	/**
	 * Handles the reference assignment for the class component given
	 */
	protected onClassRef = (ref: any) => {
		
		if (!ref) 
			return;
			
		const key = ref.props['data-modal-service-key'];

		this.setState(s => {
			const o = [...s.ordered];
			const m = o.find(o => o.key === key);
			if (!m)
				return;

			// cache and execute requested functions
			m.ref = ref;
			if (m.onRefActions)
				m.onRefActions.emit(ref);

			return {ordered: o};
		});
	}

	/**
	 * Handles the onClose of the dialog
	 */
	protected onClickDialogClose = (e: React.MouseEvent<any>) => {
		// close only if clicked with left mouse
		if (e.button == 0) {
			const k = 
				// scroll='body'
				e.currentTarget.dataset.key || 
				// scroll='paper'
				e.currentTarget.parentElement.dataset.key
				
			this.close(k);
		}
	}
	

	render() {
		return (
				<>
				{this.state.ordered.map(m => {
					const Dialog = m.modalComponent || ResponsiveDialog;
					return (
						<Dialog
							disableEnforceFocus={true}
							key={m.key} 
							onClose={this.onClickDialogClose}
							{...m.modalProps}
							data-key={m.key}
							open={m.open}
						>
							{m.component}
						</Dialog>
					)
				})}
			</>
		);
	}

}

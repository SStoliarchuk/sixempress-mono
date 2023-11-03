import type { ComponentType, ComponentClass } from "react";
import type { DialogProps } from "@material-ui/core/Dialog";
import React from "react";
import { ActionRegister } from "@sixempress/utilities";

/**
 * Reads the first paramenter of the constructor function aka the props or an empty object
 */
export type PropsToPass<C> = 
	// class
	C extends ComponentClass<infer P> ? P 
	// function
	: ArgumentTypes<C> extends [infer U, ...infer O] ? U 
	// default
	: {};

/**
 * Returns the argument for the function or class
 * in case you pass class you need to pass typeof: \
 * ArgumentTypes<typeof Class>
 */
export type ArgumentTypes<F> = 
	// class
	F extends new (...args: infer A) => any 
	? A

	// function	
	: F extends (...args: infer B) => any 
	? B 

	: never;


/**
 * All the content passable to the open function
 */
export type SupportedContent = React.ReactNode | ((p?: any) => JSX.Element);

/**
 * The object to open
 */
export type ComponentToOpen<C extends ComponentType> = C | {
	/**
	 * adds a close button to the title
	 * default true
	 */
	addCloseButton?: boolean,

	title?: SupportedContent, 
	
	content: C | SupportedContent, 

	actions?: SupportedContent
};

/**
 * Props for the modal
 */
export interface ModalProps<D = any> extends Omit<DialogProps, 'open'> {
	/**
	 * Allows you to remove the spacing from the dialog title and content on removePaper true
	 */
	fuseTitleToContentPaper?: boolean;
	/**
	 * Removes the paper background from the modal
	 */
	removePaper?: boolean;
	/**
	 * executed after the modal has been closed
	 */
	onClosed?: (data?: D) => void,
}

/**
 * This interface is used for the props for a component that is opened as modal
 */
export interface ModalComponentProps<C extends ComponentType = any> {
	/**
	 * Contains the controls of the modal window
	 */
	// we set it to optional as to avoid spamming Partial<ModalComponentProps> in the app
	modalRef?: OpenModalControls<C> & {
		/**
		 * Allows you to close the button
		 */
		onClickClose: (e: React.MouseEvent<any>) => void,
	};
}

/**
 * State
 */
export interface StateModal<C extends ComponentType> {
	key: string,
	
	/**
	 * The component to open
	 */
	component: React.ReactNode,

	/**
	 * Allows you to use a custom modal component instead of the default one
	 */
	modalComponent?: ComponentType,

	/**
	 * Props to pass to the modal
	 */
	modalProps: ModalProps & {
		/**
		 * An internal function to close the modal
		 */
		manualClose: () => void,
	},

	/**
	 * The ref to the class in case the component is a class
	 */
	ref?: C extends ComponentClass ? InstanceType<C> : undefined,

	/**
	 * Present only if the user triggers onRef() before the ref was generated
	 */
	onRefActions?: C extends ComponentClass ? ActionRegister<[InstanceType<C>]> : undefined,

	/**
	 * we need to set the open/close state before removing the component to allow for transitions to occur
	 */
	open: boolean;
};

export type OpenModalControls<C extends ComponentType<any>> = {
	/**
	 * Closes a modal with optional data passed
	 */
	close: (data?: any) => void,
} & 
// add reference in case it's a class
(C extends ComponentClass<any> ? {
	/**
	 * This function is executed once the ComponentClass has been built and the reference constructed
	 * 
	 * you can trigger it multiple times, it will return the cached value
	 */
	onRef: (fn: (ref: InstanceType<C>) => void) => void,
} : {})


export type MSProps = {};

export interface MSState<C extends ComponentType = ComponentType<any>> {
	/**
	 * The active keys in the service
	 */
	keys: string[],
	/**
	 * All the modals ordered in the open() sequence
	 */
	ordered: StateModal<C>[];
}

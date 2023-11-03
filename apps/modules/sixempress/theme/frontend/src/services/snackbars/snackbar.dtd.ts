import { SnackbarProps } from "@material-ui/core/Snackbar";
import { Omit } from "@material-ui/core";

export declare type SnackbarVariant = "error" | "warning" | "info" | "success";

export type SimpleSnackbarServiceProps = Omit<SnackbarProps, 'open'> & {
	variant?: SnackbarVariant,
	onClose?: (reason?: string) => void;
};

export type ComplexSnackbarServiceProps = Omit<SnackbarProps, 'open'> & {
	onClose?: (reason?: string) => void;
}; 

export interface SSState {
	orderedKeys: string[];
	openedSnacks: {[key: string]: OpenTrigger}
}

export declare type StateChangeRequest =
{
	action: 'open',
	key: string,
	config: OpenTrigger
} | {
	action: 'close',
	key: string,
	reason?: string,
} | {
	action: "dismissAll"
};

export declare type OpenTrigger = SimpleTrigger | ComplexTrigger;


interface SimpleTrigger {
	type: 'simple';
	opts?: SnackbarProps;
	variant?: "error" | "warning" | "info" | "success";
}

interface ComplexTrigger {
	type: 'complex';
	opts: SnackbarProps;
	content: JSX.Element;
}


export interface SnackbarControl {
	close: () => void;
}

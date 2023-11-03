import { AbstractControl, FormGroup } from "react-reactive-form";
import { TextFieldProps } from "@material-ui/core/TextField";
import { AmtsFieldProps } from "../../fields/dtd";
import { Omit } from "@material-ui/core";
import { IAsyncModelSelectProps } from "../../async-model-table-select/dtd";
import { IBaseModel } from "../../../services/controllers/IBaseModel";

export const editorComponentId = 'editorComponentId';

export interface EditorAmtsConfig<T extends IBaseModel> extends Omit<AmtsFieldProps<T>, 'amtsInput' | 'textFieldProps'> {
	amtsInput: Omit<IAsyncModelSelectProps<T>, 'choseFn'> & {
		afterChose?: (v?: T, control?: AbstractControl) => void,
		choseFn?: IAsyncModelSelectProps<T>['choseFn'],
	};
	textFieldProps?: TextFieldProps;
	modelClass: string;
}

export interface AbstractEditorConfig<T> {
	
	onSaveSuccess: (beResponse?: T, id?: string) => void;


	onSaveError: (err: any) => void;

	/**
	 * Ovveridde the action area below (the default save btn)
	 */
	saveActionArea?: false | (() => JSX.Element);
	/**
	 * Extends the main grid to max
	 */
	extendWrapper?: boolean;
	/**
	 * The id of the object to modify
	 * it's undefined when you open the editor in "Add" mode
	 */
	idToModify: string;
	/**
	 * Instead of doing a PATCH, does a PUT
	 */
	usePut?: boolean;


	editorComponentId?: string;
}



export interface AbstractEditorProps<T> extends Partial<AbstractEditorConfig<T>> {
	/**
	 * The name of the ID parameter in the routing.module
	 * You can ovveride it if you need to do some fancy stuff
	 */
	routeIdParamName?: string;
	
}

export interface AbstractEditorState<T> {
	/**
	 * The formgroup of the app
	 */
	formGroup?: FormedGroup<T>;
}



interface FormedGroup<T> extends FormGroup {
	value: T;
}

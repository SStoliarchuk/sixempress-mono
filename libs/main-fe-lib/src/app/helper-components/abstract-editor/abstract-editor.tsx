import React from 'react';
import Grid from '@material-ui/core/Grid';
import Divider from '@material-ui/core/Divider';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import IconButton from '@material-ui/core/IconButton';
import Delete from '@material-ui/icons/Delete';
import Container from '@material-ui/core/Container';
import { FieldGroup, FieldControl, FormControl, FormArray, AbstractControl } from 'react-reactive-form';
import { FieldsFactory } from '../fields/fields-factory';
import { AbstractEditorLogic } from './abstract-editor.logic';
import { FetchableField } from '../../services/controllers/dtd';
import { CheckboxProps, SelectProps, SwitchProps, TextFieldProps } from '@material-ui/core';
import { AmtsFieldProps } from '../fields/dtd';
import { TopLevelEditorPart, IEditorPart, CutPart } from './dtd/editor-parts.dtd';
import { BaseField, IEditorFormControlOptions, SelectAsyncModelField } from './dtd/fields.dtd';
import { DateFieldProps } from '../fields/date.field';
import { IBaseModel } from '../../services/controllers/IBaseModel';
import { RouterService } from '../../services/router/router-service';

// TODO cache some cool stuff for the perfomance ??
// TODO add a wrapper for the editor modal, and place a close button on top and a white background

/**
 * This components has some default styles and html generations for the editor
 */
export abstract class AbstractEditor<T extends IBaseModel, P = {}, S = {}> extends AbstractEditorLogic<T, P, S> {


	protected closeEditor = () => {
		if (this.props.modalRef) {
			this.props.modalRef.close();
		} else {
			RouterService.back();
		}
	}

	/**
	 * Use this to trigger the saving from the HTML
	 */
	protected saveToBe = (e?: any) => {
		if (e) { e.preventDefault(); }
		this.send().subscribe();
	}


	render(): JSX.Element {
		
		if (!this.state.formGroup) { 
			return (null); 
		}
		
		// no container
		if (
			// if in modal automatically set no continer
			(this.props.modalRef && this.props.extendWrapper !== false) || 
			// or if manual setting set to extend
			this.props.extendWrapper
		) {
			return (
				<FieldGroup
					control={this.state.formGroup}
					render={this.getMainFormGroupRenderFn}
				/>
			);
		} 
		// container
		else {
			return (
				<Container disableGutters maxWidth='md'>
					<FieldGroup
						control={this.state.formGroup}
						render={this.getMainFormGroupRenderFn}
					/>
				</Container>
			);
		}
	
	}

	
	/**
	 * Wrap the content in a Grid inside a paper
	 */
	private getMainFormGroupRenderFn = () => {
		const paperParts = this.generateFormParts();

		// only 1 paper container
		if (paperParts.length === 1) {
			return (
				<form aria-label="form" className='ae-form' onSubmit={this.saveToBe}>
					<Paper>
						<Box width='100%' p={2}>
							<Grid container spacing={2}>
								{paperParts[0].jsx}
							</Grid>
						</Box>
					</Paper>
				</form>
			);
		}
		// different paper because of cuts
		// or no paper at all
		else {
			return (
				<form aria-label="form" className='ae-form' onSubmit={this.saveToBe}>
					{paperParts.map((p, idx) => {
						const WrapIn = p.usePaper ? Paper : React.Fragment;
						return (
							<Box key={idx} mb={idx !== paperParts.length - 1 ? 3 : 0}>
								<WrapIn>
									{/* // TODO move the styles to .css please  */}
									<Box width='100%' {...(p.usePaper ? {p: 2} : {})}>
										<Grid container spacing={2}>
											{p.jsx}
										</Grid>
									</Box>
								</WrapIn>
							</Box>
						);
					})}
				</form>
			);
		}

	}

	private generateFormParts = () => {

		const generated = this.generateJsxByEditorSettings(this.cache.editorSettings);
		const paperParts: {usePaper: boolean, jsx: any[]}[] = [];
		let parts: (JSX.Element | JSX.Element[])[] = [];

		// we use editorSettings to search for cut types index
		// and the we use the gIdx to push content
		// because the generaetd array generates only jsx items
		// and cut/abstractControl is not a jsx item
		// so we need two indexes to keep trak of editorSettings and generated array
		for (let i = 0, gIdx = 0; i < this.cache.editorSettings.length; i++, gIdx++) {
			switch (this.cache.editorSettings[i].type) {
		
				// cut away the parts
				case 'cut':
					if (parts.length !== 0) {
						paperParts.push({
							jsx: parts,
							usePaper: (this.cache.editorSettings[i] as CutPart).usePaperForBeforeCut === false ? false : true,
						});
						// restore the array for the next part
						parts = [];
					}
					gIdx--;
					break;
					
				// no jsx content, so skip it
				case 'abstractControl':
					gIdx--;
					break;

				// jsx content add to array
				default: 
					parts.push(generated[gIdx]);
					break;

			}
		}

		// add remaining items
		if (parts.length !== 0) { 
			paperParts.push({jsx: parts, usePaper: true}); 
		}

		if (this.config.saveActionArea !== false) {
			// if the save btn container has to be cut away from the rest or just separaeted by the divider
			const addSeparatedBtn = this.cache.editorSettings[this.cache.editorSettings.length - 1].type === 'cut';
			
			const saveBtn = this.config.saveActionArea ? this.config.saveActionArea() : (
				<Box width='100%' display='flex' flexDirection='row-reverse'>
					<Button disabled={this.state.formGroup.invalid} variant='contained' color='primary' onClick={this.saveToBe}>Conferma</Button>
					<Button onClick={this.closeEditor}>Annulla</Button>
				</Box>
			);
			if (addSeparatedBtn) {
				paperParts.push({jsx: saveBtn as any, usePaper: true});
			}
			else if (paperParts[paperParts.length - 1]) {
				paperParts[paperParts.length - 1].jsx.push(
					<Grid item xs={12} key={'saveBtn-key-jsx-action-area-grid-element'}>
						<Divider className='def-mui-divider'/>
						{saveBtn}
					</Grid>
				);
			}
		}

		return paperParts;
	}

	
	/**
	 * Generates the field type to use by reading the editor settings
	 */
	private generateJsxByEditorSettings(editorSettings: TopLevelEditorPart<any>[] | IEditorPart<any>[], recursivePath: string = ''): (JSX.Element | JSX.Element[])[] {
		const car: (JSX.Element | JSX.Element[])[] = [];
		for (let i = 0; i < editorSettings.length; i ++) {
			

			const obj = editorSettings[i];

			const currKey = this.getCurrKey(obj, recursivePath);
			
			switch (obj.type) {

				case 'divider':
					car.push((
						<Grid item xs={12} key={i} {...(obj.gridProp || {})}>
							<Divider/>
						</Grid>
					));
					break;
					
				case 'jsx':
					car.push((
						<Grid item xs={12} key={i} {...(obj.gridProp || {})}>
							{typeof obj.component === 'function' ? obj.component() : obj.component}
						</Grid>
					));
					break;

				case 'formGroup':
					if (obj.wrapRender) {
						car.push((
							<Grid item xs={12} md={6} key={i + currKey} {...(obj.gridProp || {})}>
								{obj.wrapRender(<>{this.generateJsxByEditorSettings(obj.logic.parts, currKey)}</>)}
							</Grid>
						));
					}
					else {
						car.push(this.generateJsxByEditorSettings(obj.logic.parts, currKey) as JSX.Element[]);
					}
					break;
					
				case 'formControl':

					/**
					 * Returns the choseFn to assignt to amts field
					 * 
					 * this function exists as in case the amts field is part of an array, this function will be created different
					 * for each child as they have a different keyToUse
					 */
					const getChoseFn = (keyToUse: string) => (v?: T) => {
						const currController = this.state.formGroup.get(keyToUse);

						const fetchable = v && new FetchableField(v._id, (obj.logic as SelectAsyncModelField).props.modelClass, v);
						currController.patchValue(fetchable);
	
						if ((obj.logic as SelectAsyncModelField).props.amtsInput.afterChose) {
							(obj.logic as SelectAsyncModelField).props.amtsInput.afterChose(v, currController);
						}
					};

					// override some fns
					if (obj.logic.component === 'SelectAsyncModel') {
						
						// fix the async model ONLY if the already fix is not already present
						if (!(obj.logic as any)._amtsFieldFnsUpdated) {
			
							// add label
							if (obj.logic.props.textFieldProps) { 
								obj.logic.props.textFieldProps.label = obj.logic.label; 
							} 
							else { 
								obj.logic.props.textFieldProps = {label: obj.logic.label}; 
							}

							// give the fetched to the render
							const currFn = obj.logic.props.renderValue;
							obj.logic.props.renderValue = (v?: FetchableField<T>) => currFn(v && v.fetched);

							// set the choseFn to update the value with the fetchable field instead of the 
							// normal model
							obj.logic.props.amtsInput.choseFn = getChoseFn(currKey);
			
							// add a flag that this is ready
							// so it is not overridden again and causes recursve fns
							// like FieldsFactory.overrideKeyOnce()
							(obj.logic as any)._amtsFieldFnsUpdated = true;
						}
					}


					// check if amts field is child of formarray
					const objLogic = obj.parent && obj.logic.component === 'SelectAsyncModel' && obj.parent.type === 'formArray' 
						// if child then clone the configuration
						? {...obj.logic, props: {...obj.logic.props, amtsInput: {...obj.logic.props.amtsInput, choseFn: getChoseFn(currKey)}}}
						// else pass simply the item
						: obj.logic;

					// get The render automatically if component is string, else its a manual render
					const render = typeof obj.logic.component === 'string' ? this.getFieldToUse(objLogic) : obj.logic.component;

					const field = ( <FieldControl name={currKey} render={render} /> );

					car.push((
						<Grid item xs={12} md={6} key={i + currKey} {...(obj.gridProp || {})}>
							{obj.wrapRender ? obj.wrapRender(field) : field}
						</Grid>
					));
					
					break;


				case 'formArray':
				
					const addFn = () => {
						const toAdd = obj.logic.generateControl();
						if (toAdd) { (this.state.formGroup.get(currKey) as FormArray).push(toAdd); }
					};
					const remove = (index: number) => () => {
						(this.state.formGroup.get(currKey) as FormArray).removeAt(index);
					};

					const controls = this.state.formGroup ? (this.state.formGroup.get(currKey) as FormArray).controls : [];

					const toPush = (
						<>

							{controls.map((it, idx) => {
								
								let addDeleteButton = true;
								if (obj.logic.min) { 
									addDeleteButton = controls.length > obj.logic.min;
								}
								if (addDeleteButton && obj.logic.canDeleteChild) {
									addDeleteButton = obj.logic.canDeleteChild(this.state.formGroup.get(currKey + '.' + idx).value);
								}

								if (addDeleteButton) {
									return (
										<Box display='flex' flexDirection='row' key={currKey + controls.length + idx}>
											<Box mt={2} mr={1}>
												<IconButton onClick={remove(idx)}><Delete/></IconButton>
											</Box>
											<Box flexGrow={1}>
												<Grid container spacing={2}>
													{this.generateJsxByEditorSettings(obj.logic.parts, currKey + '.' + idx)}
												</Grid>
											</Box>
											<br/>
											<br/>
										</Box>
									);
								}
								else {
									return (
										<Grid container key={currKey + controls.length + idx} spacing={2}>
											{this.generateJsxByEditorSettings(obj.logic.parts, currKey + '.' + idx)}
										</Grid>
									);
								}

							})}

							{
								// max not reached
								(obj.logic.max ? (controls.length < obj.logic.max) : true) && 
								// can add btn
								(obj.logic.addBtn === false 
									? (null) 
									// add custom one if you want
									: typeof obj.logic.addBtn === 'function' 
										? obj.logic.addBtn() 
										: (<Button color='primary' onClick={addFn}>{obj.logic.addBtn || '+ Aggiungi'}</Button>)
								)
							}

						</>
					);

					car.push((
						<Grid item xs={12} md={6} key={i + currKey} {...(obj.gridProp || {})}>
							{obj.wrapRender ? obj.wrapRender(toPush) : toPush}
						</Grid>
					));
					
					break;
					
			}
		}

		return car;
	}

	/**
	 * A factory that returns different fields to use for the "control" type part of editor settings
	 */
	protected getFieldToUse(fieldSettings: IEditorFormControlOptions): (control: AbstractControl) => JSX.Element {
		
		let rval: (control: FormControl) => JSX.Element;
		const sett = fieldSettings as BaseField;
		
		if (!sett.props) {
			sett.props = {};
		}

		if (fieldSettings.component === 'SelectAsyncModel') {
			
			if (!fieldSettings.props.textFieldProps) {
				fieldSettings.props.textFieldProps = {};
			}

			fieldSettings.props.textFieldProps.fullWidth = true;
			fieldSettings.props.textFieldProps.variant = 'outlined';
		} 
		else if (fieldSettings.component !== 'Checkbox') {
			(sett.props as TextFieldProps).fullWidth = true;
			(sett.props as TextFieldProps).variant = 'outlined';
		}

		// reassign the label as a prop
		if (sett.label) {
			(sett.props as TextFieldProps).label = sett.label;
		}

		switch (fieldSettings.component) {

			case 'Checkbox':
				rval = FieldsFactory.getCheckbox_FormControl(fieldSettings.props as CheckboxProps & {label: string});
				break;

			case 'Switch':
				rval = FieldsFactory.getSwitch_FormControl(fieldSettings.props as SwitchProps & {label: string});
				break;
	
			case 'TextField':
				rval = FieldsFactory.getTextField_FormControl(fieldSettings.props);
				break;

			case 'NumberField':
				rval = FieldsFactory.getNumberField_FormControl(fieldSettings.props);
				break;

			case 'PriceField':
				rval = FieldsFactory.getPriceField_FormControl(fieldSettings.props);
				break;

			case 'TextArea':
				rval = FieldsFactory.getTextArea_FormControl(fieldSettings.props);
				break;

			case 'SelectField':
				rval = FieldsFactory.getSelectField_FormControl(fieldSettings.values, fieldSettings.props as SelectProps & {label: string});
				break;

			case 'MultiSelectField':
				rval = FieldsFactory.getMultiSelectField_FormControl(fieldSettings.values, fieldSettings.props as SelectProps & {label: string});
				break;

			case 'DatePicker': 
				fieldSettings.props ? fieldSettings.props.pickerType = 'date' : fieldSettings.props = {pickerType: 'date'} as Partial<DateFieldProps> as DateFieldProps;
				rval = FieldsFactory.getDateField_FormControl(fieldSettings.props);
				break;

			case 'DateTimePicker': 
				fieldSettings.props ? fieldSettings.props.pickerType = 'datetime' : fieldSettings.props = {pickerType: 'datetime'} as Partial<DateFieldProps> as DateFieldProps;
				rval = FieldsFactory.getDateField_FormControl(fieldSettings.props);
				break;

			case 'TimePicker': 
				fieldSettings.props ? fieldSettings.props.pickerType = 'time' : fieldSettings.props = {pickerType: 'time'} as Partial<DateFieldProps> as DateFieldProps;
				rval = FieldsFactory.getDateField_FormControl(fieldSettings.props);
				break;

			case 'SelectAsyncModel':
				rval = FieldsFactory.getAmtsField_FormControl(fieldSettings.props as AmtsFieldProps<any>);
				break;
			
		}
		// TODO fix this later on when you fix the typing on the fields factory
		return rval as any;
	}

}

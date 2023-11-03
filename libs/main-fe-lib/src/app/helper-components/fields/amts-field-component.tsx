import React from 'react';
import { AmtsFieldProps } from './dtd';
import Popover from '@material-ui/core/Popover';
import IconButton from '@material-ui/core/IconButton';
import Close from '@material-ui/icons/Close';
import { AsyncModelTableSelect } from '../async-model-table-select/async-model-table-select';
import { IBaseModel } from '../../services/controllers/IBaseModel';
import { FieldsFactory } from './fields-factory';

// tslint:disable jsx-no-lambda
// TODO optimize with React.memo() ??

/**
 * This is a field that allows you to chose from the BE a model in async mode
 */
export function AmtsField<T extends IBaseModel = any>(props: AmtsFieldProps<T>) {

	// open/close popover
	const [popAnchor, togglePopover] = React.useState<null | HTMLElement>(null);
	const [bodyStyle, setBodyStyle] = React.useState<object>({});

	const openPopover = (e: React.MouseEvent<any> | React.KeyboardEvent<any>) => {
		if (props.onOpen) { props.onOpen(e); }
		togglePopover(e.currentTarget);
	};
	const closePopover = () => {
		if (props.onClose) { props.onClose(); }
		togglePopover(null);
	};

	// create value here and check that it is not undefined as to not break the controlled input
	let value: any = props.textFieldProps.value && props.renderValue(props.textFieldProps.value as any);
	// check that the value is not undefined or is 0
	// if it is null | undefined, then it causes problems with TextField
	value = ((value || value === 0) ? value : '');

	return (
		<>
			<Popover
				open={Boolean(popAnchor)}
				anchorEl={popAnchor}
				onClose={closePopover}
				anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
				transformOrigin={{vertical: 'top', horizontal: 'center'}}
			>
				<AsyncModelTableSelect 
					{...props.amtsInput}
					choseFn={props.closePopoverOnSelect !== false
						? (model: any) => {
							props.amtsInput.choseFn(model);
							closePopover();
						}
						: props.amtsInput.choseFn
					}
					onEditorOpen={() => {
						// manually remove overflow, otherwise we get the following issue:
						// 1 we open the popover, which sets body.overflow = 'hidden'
						// 2 we click onEditorOpen which reads the properties of body.overflow and saves it to restore onClose()
						// 3 we closePopover() which does not modify style
						// 4 we close modal which then "restores" the overflow hidden
						// we also remove padding-right as it's a property used by the modal
						document.body.style.removeProperty('overflow');
						document.body.style.removeProperty('padding-right');
						if (props.amtsInput.onEditorOpen) { props.amtsInput.onEditorOpen(); }
						closePopover();
					}}
				/>
			</Popover>
			<FieldsFactory.TextField
				className='amts-field'
				InputProps={(props.canClearField && props.textFieldProps.value) ? {
					endAdornment: (
						<IconButton 
							size='small' 
							onClick={(e: any) => { 
								e.stopPropagation();
								props.amtsInput.choseFn(null);
								if (props.textFieldProps.onChange) { 
									props.textFieldProps.onChange(null); 
								}
							}}
						>
							<Close/>
						</IconButton>
					)
				} : undefined}
				{...props.textFieldProps}
				onClick={(e: React.MouseEvent<any>) => {
					if (props.textFieldProps.onClick) { props.textFieldProps.onClick(e); }
					openPopover(e);
				}}
				onKeyDown={(e: React.KeyboardEvent<any>) => {
					if (props.textFieldProps.onKeyDown) { props.textFieldProps.onKeyDown(e as any); }
					if (e.key === 'Tab' || e.key === 'Shift') { return; }
					openPopover(e);
				}}
				value={value}
			/>
		</>
	);

}

import React from 'react';
import { ConfirmModalComponent } from '../../../helper-components/confirm-modal';
import { SelectFieldValue } from '../../../helper-components/fields/dtd';
import { FieldsFactory } from '../../../helper-components/fields/fields-factory';
import { AbstractDbItemController } from '../../../services/controllers/abstract-db-item.controller';
import { IBaseModel } from '../../../services/controllers/IBaseModel';
import { RequestService } from '../../../services/request-service/request-service';
import { ObjectUtils } from '@sixempress/utilities';


type SCFProps<T extends IBaseModel> = {
	model: T, 
	field: keyof T | (string & {}), 
	enumLabel_to_Value: object,
	controller: AbstractDbItemController<T>
}

type SCFState = {
	value: string | number,
}

export class SelectChangeField<T extends IBaseModel = any> extends React.Component<SCFProps<T>, SCFState> {

	private values: SelectFieldValue[];

	constructor(p: SCFProps<T>) {
		super(p);
		this.values = Object.values(p.enumLabel_to_Value).filter(e => typeof e === 'number').map(i => ({label: p.enumLabel_to_Value[i], value: i}));
		this.state = { value: ObjectUtils.getValueByDotNotation(p.model, p.field as string) };
	}

	private onChange = (e: React.ChangeEvent<any>) => {
		e.stopPropagation();

		const oldValue = this.state.value;
		const newValue = e.target.value;

		ConfirmModalComponent.open(
			'Cambio valore', 
			'Conferma di voler cambiare il valore da: "' + this.props.enumLabel_to_Value[oldValue] + '" a: "' + this.props.enumLabel_to_Value[newValue] + '"', 
			(r) => {
				if (!r) return;

				this.setState({value: newValue});
		
				RequestService.client('patch', this.props.controller.bePath + this.props.model._id, {data: [{op: 'set', path: this.props.field, value: newValue}]})
				.catch(e => {
					this.setState({value: oldValue});
					throw e;
				});
			}
		);
	}

	private stopPropagation = (e: React.MouseEvent<any>) => e.stopPropagation();

	render() {
		return (
			<FieldsFactory.SelectField
				margin='none'
				variant='standard'
				onClick={this.stopPropagation}
				onChange={this.onChange}
				values={this.values || null}
				value={this.state.value}
			/>
		)
	}
}
import React from 'react';
import { AFCProps, AFCField } from './dtd';
import { FieldsFactory } from '../../../fields/fields-factory';
import { IAsyncModelSelectProps } from '../../../async-model-table-select/dtd';
import { AmtsFieldProps } from '../../../fields/dtd';
import { ObjectUtils } from '@sixempress/utilities';
import { RequestService } from '../../../../services/request-service/request-service';

export class AmtsFilterComponent extends React.Component<AFCProps> {


	/**
	 * This cache contains items queried when the filter is set in the outputData
	 * by the user manually BEFORE using this component
	 * 
	 * so the value is not cached inside the fields.value
	 * so we query it and put it here for comfort
	 */
	private static cache: {[_id: string]: any} = {};


	constructor(props: AFCProps) {
		super(props);

		// remove stuff to not have errors of too many cached objects
		// TODO improve the deleting mode with time maybe ??
		if (Object.keys(AmtsFilterComponent.cache).length > 30) {
			AmtsFilterComponent.cache = {};
		}
		

		// bepath => id => modelPath
		const toQuery: {[bePath: string]: {[_id: string]: string}} = {};

		for (const field of props.fields) {

			field.textFieldProps.variant = 'standard';
			field.textFieldProps.margin = 'normal';
			field.textFieldProps.fullWidth = true;

			
			field.canClearField = true;
			// add the internal choseFn
			(field.amtsInput as IAsyncModelSelectProps<any>).choseFn = (v) => {
				this.setFieldValue(field as any, v);
				this.updateOutput();
				// when deleting, it doesnt update
				this.forceUpdate();
			};

			const filterPath = this.getFilterPathToUse(field);

			// delete the vlaue
			if (typeof props.inputData[filterPath] === 'undefined') {
				this.setFieldValue(field, null);
			} 
			// restore the values
			else {
				// if filter present  &&  if the filter is a filter on the _id
				// if the value is present in cache
				if (AmtsFilterComponent.cache[props.inputData[filterPath]] || (field.value && field.value._id === props.inputData[filterPath])) {
					const val = AmtsFilterComponent.cache[props.inputData[filterPath]] || field.value;
					this.setFieldValue(field, val);
				}
				// then query it
				else {
					if (!toQuery[field.amtsInput.bePath]) { 
						toQuery[field.amtsInput.bePath] = {};
					}
					toQuery[field.amtsInput.bePath][props.inputData[filterPath]] = field.modelPath as string;
				}
			}

		}

		if (Object.keys(toQuery).length !== 0) {
			this.getItemsValues(toQuery);
		}

		this.updateOutput();
	}

	private getFilterPathToUse(f: AFCField<any>): string {
		return f.useOnlyModelPath ? f.modelPath as string : f.modelPath as string + '.id';
	}



	private async getItemsValues(ids: {[bePath: string]: {[_id: string]: string}}) {

		const fork: Promise<any>[] = [];

		for (const beP in ids) {
			fork.push((async () => {
				const res = await RequestService.client('get', beP, {params: {filter: {_id: {$in: Object.keys(ids[beP])}}}});
				const resHm = ObjectUtils.arrayToHashmap(res.data, '_id');
				const fields_modelPathHm = ObjectUtils.arrayToHashmap(this.props.fields, 'modelPath');

				for (const id in ids[beP]) {
					if (resHm[id]) {
						AmtsFilterComponent.cache[id] = resHm[id];
						this.setFieldValue(fields_modelPathHm[ids[beP][id]], resHm[id]);
					} 
					else {
						this.setFieldValue(fields_modelPathHm[ids[beP][id]], null);
					}
				}

			})());
		}

		await Promise.all(fork);
		this.forceUpdate();
	}

	
	// need to set a value on the object (for cache)
	// and need to set a value on the textField for the rendering
	private setFieldValue(f: AFCField<any>, val: any) {
		f.value = val;
		(f as any as AmtsFieldProps<any>).textFieldProps.value = val;
	}

	
	private updateOutput() {
		for (const f of this.props.fields) {
			const field = this.getFilterPathToUse(f);
			if (f.value) {
				this.props.outputData[field] = f.value._id;
			} else { 
				delete this.props.outputData[field];
			}
		}
	}


	render() {
		return (
			<div className='select-filter-component-container'>
				{this.props.fields.map((f, idx) => (
					<React.Fragment key={idx + (f.modelPath as string)}>
						<FieldsFactory.AmtsField {...f as any}/>
					</React.Fragment>
				))}
			</div>
		);
	}

}

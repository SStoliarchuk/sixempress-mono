import React from 'react';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import { FieldsFactory, SelectFieldValue, DataStorageService, } from '@sixempress/main-fe-lib';
import { AuthService } from '@sixempress/abac-frontend';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { CachedChoice, SelectQuickActionValue } from 'apps/modules/sixempress/multip-core/frontend/src/utils/quick-chose/quick-chose.dtd';
import { QuickChose } from 'apps/modules/sixempress/multip-core/frontend/src/utils/quick-chose/quick-chose';
import { ProductController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/product.controller';

interface CSECState {
	quickChoseList: {[cacheKey: string]: {
		value: string,
	}};
}

export class CodeScannerEventsCache extends React.Component<{}, CSECState> {

	private quickChoseVals: {[cacheKey: string]: {
		label: string,
		reference: SelectQuickActionValue[],
		selectField: SelectFieldValue[],
	}} = this.createQuickChoseValues();

	constructor(p) {
		super(p);

		this.state = {
			quickChoseList: {},
		};

		for (const k in this.quickChoseVals) {
			
			const cached = DataStorageService.getSafeValue(k, 'object') as CachedChoice;
			// ensure the value is available to chose
			// in case another user enters the system
			// that doesnt have all the options
			const isPresentInValues = cached && this.quickChoseVals[k].selectField.find(v => v.value === cached.value);
	
			this.state.quickChoseList[k] = { value: isPresentInValues ? (cached as CachedChoice).value.toString() : "", };
		}
	}
	
	private createQuickChoseValues(): CodeScannerEventsCache['quickChoseVals'] {
		const toR: CodeScannerEventsCache['quickChoseVals'] = {};

		if (AuthService.isAttributePresent(Attribute.viewProducts)) {
			toR[ProductController.codeScanActionCacheKeyPRODUCT] = {
				label: "Prodotti",
				reference: ProductController.getCodeScanActionValues(),
				selectField: QuickChose.getFilteredValues(ProductController.getCodeScanActionValues()),
			};
		}

		return toR;
	}

	private onChangeSelect = (e: React.ChangeEvent<any>) => {
		const val = e.target.value;
		const k = e.currentTarget.dataset.key;
		QuickChose.updateValueInCache(k, this.quickChoseVals[k].reference, val);
		this.setState({
			quickChoseList: { ...this.state.quickChoseList, [k]: { ...this.state.quickChoseList[k], value: val }, },
		});
	}

	render() {

		// if more than 1 opts is present then ok
		if (!Object.values(this.quickChoseVals).find(v => v.selectField.length > 1)) { 
			return (null); 
		}
		
		return (
			<Paper className='def-box'>
			<Typography variant='body2'>
				Azioni predefinite per la scansione codice
			</Typography>	
				{Object.keys(this.quickChoseVals).map(k => (
					<div key={k}>
						<FieldsFactory.SelectField
							style={{minWidth: '13em'}}
							variant='outlined'
							data-key={k}
							values={[{label: "<NESSUNA>", value: ''}, ...this.quickChoseVals[k].selectField]}
							label={this.quickChoseVals[k].label}
							value={this.state.quickChoseList[k].value}
							onChange={this.onChangeSelect}
						/>
					</div>
				))}
			</Paper>
		);

	}

}

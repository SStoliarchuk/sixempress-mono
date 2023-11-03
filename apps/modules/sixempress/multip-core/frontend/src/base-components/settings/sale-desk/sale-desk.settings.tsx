import React from 'react';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import { FieldsFactory, DataStorageService } from '@sixempress/main-fe-lib';
import { MultiPCKeys } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/various';

interface SDSState {
	receiptPrint: -1 | 1 | 0,
}

export class SaleDeskSettings extends React.Component<{}, SDSState> {

	constructor(p) {
		super(p);

		const item = DataStorageService.getSafeValue(MultiPCKeys.saledesk_print_receipt, 'boolean', 'localStorage');
		this.state = { receiptPrint: typeof item === 'boolean' ? item ? 1 : 0 : -1 };
	}

	private onChangeReceipt = (e: React.ChangeEvent<any>) => {
		const selectValue = e.target.value;
		
		const cacheValue: undefined | boolean = selectValue === -1 ? undefined : selectValue === 1 ? true : false;
		DataStorageService.set<boolean>(MultiPCKeys.saledesk_print_receipt, cacheValue, 'localStorage');

		this.setState({receiptPrint: selectValue});
	}
	
	render() {
		
		return (
			<Paper className='def-box'>
				<Typography variant='body2'>
					Configurazione cassa
				</Typography>	
				<div>
					<FieldsFactory.SelectField
						style={{minWidth: '13em'}}
						variant='outlined'
						values={[{label: "Chiedi ogni volta", value: -1}, {label: 'Stampa sempre', value: 1}, {label: 'Non stampare', value: 0}]}
						label={'Stampa scontrino'}
						value={this.state.receiptPrint}
						onChange={this.onChangeReceipt}
					/>
				</div>
			</Paper>
		);

	}

}

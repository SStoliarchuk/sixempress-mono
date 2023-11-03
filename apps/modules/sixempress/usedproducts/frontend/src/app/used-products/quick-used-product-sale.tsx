import React from 'react';
import { IAsyncModelSelectProps, FieldsFactory, ModalService, FetchableField, SmallUtils, BusinessLocationsService, ModalComponentProps, ModalProps, LibSmallUtils } from "@sixempress/main-fe-lib";
import { ModelClass as MultiModelClass } from '@sixempress/multi-purpose';
import Button from "@material-ui/core/Button";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Box from "@material-ui/core/Box";
import { Customer } from '@sixempress/multi-purpose';
import { UsedProduct } from './UsedProduct';
import { CustomerController } from '@sixempress/multi-purpose';
import { UsedProductController } from './used-products.controller';

export function openQuickUsedProductSale(item: UsedProduct, modalProps: ModalProps = {}) {
	return ModalService.open(QuickUsedProductSale, {item}, {maxWidth: 'sm', fullWidth: true, ...modalProps});
}

function QuickUsedProductSale(props: {item: UsedProduct} & ModalComponentProps) {

	const locs = BusinessLocationsService.getDocPosSelectValues();

	const [customer, setCustomer] = React.useState<Customer>();
	const [loc, setLoc] = React.useState<string>(BusinessLocationsService.chosenLocationId || locs[0].value as string);

	const confirm = (e) => {
		new UsedProductController().patch(
			props.item._id,
			[{op: 'set', path: 'buyer', value: new FetchableField(customer._id, MultiModelClass.Customer)}]
		)
		.then(res => { 
			LibSmallUtils.notify('Venduto con successo', 'success'); 
			props.modalRef.close(); 
		} );
	};

	const asyncCustomerConf: IAsyncModelSelectProps<Customer> = {
		...CustomerController.AmtsFieldProps().amtsInput,
		choseFn: (c) => setCustomer(c),
	};

	
	return (
		<>
			<DialogTitle>
				Vendita veloce
			</DialogTitle>
			<DialogContent>
				{locs.length !== 1 && (
					<FieldsFactory.SelectField
						values={locs}
						value={loc}
						variant='outlined'
						label={"Posizione"}
						fullWidth={true}
						onChange={(e) => setLoc(e.target.value as string)}
					/>
				)}
				<FieldsFactory.AmtsField<Customer>
					amtsInput={asyncCustomerConf}
					canClearField={false}
					textFieldProps={{
						fullWidth: true,
						variant: 'outlined',
						label: 'Cliente',
						value: customer,
						error: !customer,
					}}
					closePopoverOnSelect={true}
					renderValue={CustomerController.formatCustomerName}
				/>
			</DialogContent>
			<Box display='flex' p={1}>
				<Box flexGrow={1}>
				</Box>
				<Button disabled={!Boolean(customer)} variant='contained' color='primary' onClick={confirm}>
					Conferma
				</Button>
			</Box>
		</>
	);

}
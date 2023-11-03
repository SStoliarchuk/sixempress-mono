import React from 'react';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';
import { FieldsFactory, ModalService, ModalComponentProps, DataStorageService } from '@sixempress/main-fe-lib';
import { printReceipt } from './receipt-printer';
import Box from '@material-ui/core/Box';
import { Sale } from '../Sale';
import { MultiPCKeys } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/various';

export interface ReceiptModalProps {
	sale: Sale;
	useCached?: true,
	forcePassedSale?: true,
	callBack?: (toPrint: boolean) => void;
	payments?: boolean,
	barcode?: string,
};

/**
 * Open the ReceiptModal
 * The modal is used to print receipts of a given sale
 * But it allows you to tweak some data
 */
export function openReceiptModal(props: ReceiptModalProps): any {

	// use the cached opt
	if (props.useCached) {
		const item = DataStorageService.getSafeValue(MultiPCKeys.saledesk_print_receipt, 'boolean', 'localStorage');
		if (typeof item === 'boolean') {
			if (!item)
				return;
			else
				return printReceipt(props.sale._id, {
					forceSale: props.forcePassedSale ? props.sale : undefined,
					payments: props.payments,
					barcode: props.barcode,
				});
		}
	}


	return ModalService.open(ReceiptModal,
		props, 
		{
			maxWidth: 'xs',
			fullWidth: true,
		}
	);
}

function ReceiptModal(props: ReceiptModalProps & ModalComponentProps) {

	const [remember, setRemember] = React.useState<boolean>(false);

	// action to print the receipt
	const printAction = (print: boolean) => (e?: any) => {
		
		if (remember)
			DataStorageService.set<boolean>(MultiPCKeys.saledesk_print_receipt, print, 'localStorage');

		props.modalRef.close();
		if (props.callBack)
			props.callBack(print); 

		if (print) {
			printReceipt(props.sale._id, {
				forceSale: props.forcePassedSale ? props.sale : undefined,
				payments: props.payments,
				barcode: props.barcode,
			});
		}
	};

	return (
		<React.Fragment>
			<DialogTitle>
				Stampa Scontrino
			</DialogTitle>
			<Box display='flex' p={1} justifyContent='space-between'>
				<div>
					{props.useCached && (
						<FieldsFactory.Switch
							label='Ricorda scelta'
							checked={remember}
							onChange={() => setRemember(!remember)}
						/>
					)}
				</div>
				<div>
					<Button onClick={printAction(false)} color="primary">
						Non stampare
					</Button>
					<Button onClick={printAction(true)} color="primary">
						Stampa
					</Button>
				</div>
			</Box>
		</React.Fragment>
	)

}

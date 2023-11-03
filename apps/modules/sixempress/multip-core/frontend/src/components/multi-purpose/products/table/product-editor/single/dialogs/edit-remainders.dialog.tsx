import React from 'react';
import { ModalService, ModalComponentProps } from '@sixempress/main-fe-lib';
import Button from '@material-ui/core/Button';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import DialogTitle from '@material-ui/core/DialogTitle';
import { ProductController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/product.controller';
import { Product } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/Product';

export function openEditRemaindersDialog(prods: Product[]) {
	return ModalService.open(EditRemaindersDialog, { prods } );
}

function EditRemaindersDialog(props: {prods: Product[]} & ModalComponentProps) {

	const close = () => {
		props.modalRef.close();
	};

	const openProducts = () => {
		ProductController.openProductsTableOperation('manualqt', props.prods as {_id: string}[]);
		close();
	};

	return (
		<>
			<DialogTitle>
				Giacenze aggiuntive
			</DialogTitle>
			<DialogContent>
				Ci sono giacenze che referenziano vecchie versioni del prodotto, puoi aggiornare queste giacenze dalle rispettive tabelle
			</DialogContent>
			<DialogActions>
				<Button onClick={close} color='primary'>Chiudi</Button>
				<Button onClick={openProducts} color='primary' variant='contained'>Apri Giacenza</Button>
			</DialogActions>
		</>
	);

}

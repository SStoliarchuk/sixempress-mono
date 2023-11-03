import React from 'react';
import { IAsyncModelSelectProps, AsyncModelTableSelect, ModalComponentProps } from "@sixempress/main-fe-lib";
import { Customer } from "./Customer";
import Button from "@material-ui/core/Button";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Popover from "@material-ui/core/Popover";
import TextField from '@material-ui/core/TextField';
import { CustomerController } from './customer.controller';

export function ChoseCustomerDialog(props: {text?: string} & ModalComponentProps) {

	const [customer, setCustomer] = React.useState<Customer>();
	const [popoverAnchor, setPopover] = React.useState<HTMLElement | null>(null);

	const confirm = (e) => props.modalRef.close(customer);

	const asyncCustomerConf: IAsyncModelSelectProps<Customer> = {
		...CustomerController.AmtsFieldProps().amtsInput,
		choseFn: (c) => { setCustomer(c); setPopover(null); },
		onEditorOpen: () => { setPopover(null) },
	};

	
	return (
		<React.Fragment>
			<DialogTitle>
				Selezione cliente
			</DialogTitle>
			<DialogContent>

				{props.text || 'Seleziona il cliente'}
				<TextField
					label='Cliente'
					variant='outlined'
					margin="normal"
					className='input-pointer'
					fullWidth
					value={CustomerController.formatCustomerName(customer)}
					error={!Boolean(customer)}
					disabled={true}
					onClick={(e) => setPopover(e.currentTarget)}
				/>

				<Popover
					open={Boolean(popoverAnchor)}
					anchorEl={popoverAnchor}
					onClose={() => setPopover(null)}
					anchorOrigin={{
						vertical: 'bottom',
						horizontal: 'center',
					}}
					transformOrigin={{
						vertical: 'top',
						horizontal: 'center',
					}}
				>
					<AsyncModelTableSelect {...asyncCustomerConf}/>
				</Popover>
			</DialogContent>
			<DialogActions>
				<Button disabled={!Boolean(customer)} color='primary' onClick={confirm}>
					Conferma
				</Button>
			</DialogActions>
		</React.Fragment>
	)

}
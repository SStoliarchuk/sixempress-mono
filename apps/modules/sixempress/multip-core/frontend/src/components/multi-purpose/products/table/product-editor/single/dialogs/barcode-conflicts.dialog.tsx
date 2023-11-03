import React from 'react';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import Button from '@material-ui/core/Button';
import { ModalComponentProps, ModalService } from '@sixempress/main-fe-lib';


export function openConflictsModal(type: 'barcode' | 'tags', items: string[]) {
	ModalService.open(Conflicts,
		{items, type},
		{maxWidth: 'sm', fullWidth: true},
	);
}

function Conflicts(props: {type: 'barcode' | 'tags', items: string[]} & ModalComponentProps) {

	const filtered: string[] = [];
	for (const b of props.items) {
		if (!filtered.includes(b)) {
			filtered.push(b);
		}
	}

	return (
		<React.Fragment>
			<DialogTitle>
				Conflitto {props.type === 'barcode' ? 'codici a barre' : 'codici univoci'}
			</DialogTitle>
			<DialogContent>
				{props.type === 'barcode'
					?	"Alcuni codici a barre sono gia' presenti nel sistema, per salvare il prodotto, bisogna cambiare i seguenti codici:"
					: "Alcuni codici univoci sono gia' presenti nel sistema, per salvare il prodotto, bisogna cambiare i seguenti codici:"
				}				
				<br/>
				<br/>
				{filtered.map((b) => (<span key={b}>{b}<br/></span>))}
			</DialogContent>
			<DialogActions>
				<Button color='primary' onClick={e => props.modalRef.close()}>
					Chiudi
				</Button>
			</DialogActions>
		</React.Fragment>
	)

}
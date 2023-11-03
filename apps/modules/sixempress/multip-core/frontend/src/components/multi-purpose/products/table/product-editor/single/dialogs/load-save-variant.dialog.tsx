import React from 'react';
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import { FieldsFactory, ModalComponentProps } from '@sixempress/main-fe-lib';

export function VariantName(prop: ModalComponentProps & {callback: (val: string) => void}) {

	const [val, setVal] = React.useState('');

	const onChange = (e: any) => setVal(e.currentTarget.value);

	const onClick = () => {
		prop.callback(val);
		prop.modalRef.close();
	};

	return (
		<Box p={2}>
			<h2>Inserire il nome per salvare la combinazione</h2>
			<FieldsFactory.TextField
				label='Nome'
				value={val}
				onChange={onChange}
			/>
			<Box display='flex' pt={1} flexDirection='row-reverse'>
				<Button onClick={onClick} color='primary'>Conferma</Button>
			</Box>
		</Box>
	);

}



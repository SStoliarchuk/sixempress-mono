import React from 'react';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import { DataStorageService } from '@sixempress/utilities';
import { CacheKeys, CodeScannerService, FieldsFactory, SelectFieldValue } from '@sixempress/main-fe-lib';


export function BarcodeConfigurationSettings() {

	return (
		<Paper className='def-box'>
			<Typography variant='body2'>
				Impostazioni scanner barcode
			</Typography>	
			<BarcodeMinChar/>
			<br/>
			<BarcodeTimouteMs/>
		</Paper>
	);

}

function BarcodeMinChar() {
	
	const [v, setV] = React.useState(CodeScannerService.minimumCharsLength);

	const onChange = (e) => {
		const toset = e.currentTarget.value;
		setV(toset);
		DataStorageService.localStorage.setItem(CacheKeys.barcodeCharsBeforeTimeout, toset);
		CodeScannerService.minimumCharsLength = toset;
	};

	return(
		<FieldsFactory.NumberField
			label="Caratteri letti prima del timeout"
			variant='outlined'
			value={v}
			onChange={onChange}
		/>
	)
}

function BarcodeTimouteMs() {

	const vals: SelectFieldValue[] = [
		{
			value: "CUSTOM",
			label: "Personalizzata",
		},
		{
			value: 20,
			label: "Barcode USB (20ms)",
		},
		{
			value: 60,
			label: "Barcode Bluetooth (60ms)",
		},
	];

	const currentTime: number = CodeScannerService.keyupTimeoutMs;
	const selValToSet = vals.find(v => v.value === currentTime);

	const [selVal, setSelVal] = React.useState(selValToSet ? selValToSet.value : "CUSTOM");
	const [manVal, setManVal] = React.useState(selValToSet ? selValToSet.value : currentTime);

	const onChangeSelectTimeout = (e: React.ChangeEvent<any>) => {
		let v = e.target.value;
		setSelVal(v);

		if (v === "CUSTOM") {
			v = manVal;
		}

		DataStorageService.localStorage.setItem(CacheKeys.barcodeTimeoutMs, v);
		CodeScannerService.keyupTimeoutMs = v;
	};

	const onChangeManual = (e: React.ChangeEvent<any>) => {
		const v = e.currentTarget.value;
		setManVal(v);
		DataStorageService.localStorage.setItem(CacheKeys.barcodeTimeoutMs, v);
		CodeScannerService.keyupTimeoutMs = v;
	};

	return (
		<>
			<FieldsFactory.SelectField
				values={vals}
				label="Tempo di timeout"
				value={selVal}
				fullWidth={false}
				variant='outlined'
				onChange={onChangeSelectTimeout}
			/>
			{selVal === "CUSTOM" && (
				<FieldsFactory.NumberField
					label="Tempo manuale"
					value={manVal}
					fullWidth={false}
					variant='outlined'
					onChange={onChangeManual}
				/>
			)}

		</>
	);
}

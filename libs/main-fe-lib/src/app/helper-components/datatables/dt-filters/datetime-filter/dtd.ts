export declare type dateTimeOutput = {from: Date | null, to: Date | null};

export interface FDTDPProps {
	label: string;
	/**
	 * The starting value of the picker
	 */
	value?: dateTimeOutput;
	
	/**
	 * Default true
	 */
	enabled?: boolean;
	/**
	 * Default true
	 */
	canDisable?: boolean;
	onChange?: (data: {enabled: boolean, value: dateTimeOutput}) => void;
}


export interface FDTDPState {
	from: null | Date,
	to: null | Date,
	enabled: boolean
}


export interface FDTDFProps<T = any> {
	timeFields: DtTimeFilterField<T>[];
	inputData: object;
	outputData: object;
}

export interface DtTimeFilterField<T> { 
	label: string;
	modelPath: keyof T | (string & {});
	enabled?: boolean;
	canDisable?: boolean;
	value?: dateTimeOutput;
}

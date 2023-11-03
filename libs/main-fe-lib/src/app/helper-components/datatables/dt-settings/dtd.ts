
export interface DtSettings {
	tableName?: string;
	tableIdx: number;
	order: [number, 'asc' | 'desc'];
	columns: {visible: boolean, title: any, orderable: boolean, data: string}[];
}

export interface DtSettingsPopoverProps {

	// onApply: () => void;
	allVariantsTableLength: number;
	getDtSettings: () => DtSettings;
	onDeleteTable?: (idx: number) => void;
	onApply: (sett: DtSettings) => void;
	onClose: () => void;

}

export interface DSPState {
	tableIdx: number;
	tableName: string;
	columns: {visible: boolean, title: any, orderable: boolean, data: string}[];
	filterByColIdx: number;
	filterDirection: 'asc' | 'desc';
}

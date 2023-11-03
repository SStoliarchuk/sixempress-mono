import { ExternalConnection } from "apps/modules/sixempress/multip-core/frontend/src/base-components/settings/multip-content/multip-content.dtd";

export interface RawFile {
	id: number | string,
	name: string,
	url: string,
	mimeType?: string,
}

export interface RFTProps {
	/**
	 * this will be true | 'image' | 'video' etc..
	 */
	selectMode: boolean;
	/**
	 * The files selected
	 */
	onSelectConfirm: (files: RawFile[]) => void,
}

export interface RFTState {
	selectedConnIdx: number,
	conns: ExternalConnection[],
	files: RawFile[],
	filesLoadStatus: 'endpointUnreachable' | 'endpointNotConfigured' | 'loading' | 'done',

	isExtSyncModulePresent: boolean,
	currentPage: number,
	totalElements: number,
	perPage: number,
	
	selected: {[connIdx: number]: {[id: string]: RawFile}},
}

export interface RawFilesUploadStatus {
	externalConnectionId: string, 
	data: {
		images?: RawFile[],
		others?: RawFile[],
	}
};
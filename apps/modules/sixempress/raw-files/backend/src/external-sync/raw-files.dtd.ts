export interface RawFilesUploadStatus {
	externalConnectionId: string, 
	data: {
		images?: RawFileInfo[],
		others?: RawFileInfo[],
	}
};

export interface RawFileGet {
	total: number, 
	items: RawFileInfo[]
}

export interface RawFileInfo {
	id: number | string,
	url: string,
	name: string,
	mimeType?: string,
}

export interface RawFileOptions {
	filter?: {
		name?: string,
		mimeType?: string,
	};

	limit: number,
	skip: number,
}

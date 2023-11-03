import { IBaseModel } from "../../services/controllers/IBaseModel";

export enum MediaFileType {

	genericFile = 1,
	image,
	video,
	pdf,
	text,
	
}

export interface MediaFile extends IBaseModel {
	content: string;
	type: MediaFileType;
	name: string;
	mimeType?: string;
	extension: string;
}
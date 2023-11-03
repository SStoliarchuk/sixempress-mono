import FormData from "form-data";
import { HttpRequestService, RequestHelperService } from "@sixempress/main-be-lib";
import { ExternalConnection, ExternalConnectionType } from "@sixempress/external-sync";
import { Request } from "express";
import to from "await-to-js";
import { RawFileGet, RawFileInfo, RawFilesUploadStatus } from "../raw-files.dtd";
import { WPRemotePaths } from "@sixempress/external-sync";

export class WPRawFilesService {

	/**
	 * Returns the remote data
	 */
	public static async getData(req: Request, ec: ExternalConnection): Promise<RawFileGet> {

		const filter = req.qsParsed.filter || {};

		const res = await HttpRequestService.request(
			'GET', ec.originUrl + WPRemotePaths.raw_files, undefined,
			{
				headers: {'x-api-key': ec.auth.apiKey},
				params: {
					limit: req.qsParsed.limit,
					skip: req.qsParsed.skip,
					mime_type: filter.mimeType,
				},
			}
		);
		
		return {
			total: parseInt(RequestHelperService.findHeaderKeyValue(res.headers, 'X-WP-Total').toString()),
			items: WPRawFilesService.remapFileToRawFile(res.data as any[]),
		}
	}

	/**
	 * Tries to post the body given to any wordpress connections, if one succedes then it stops
	 * @param ecs The external connection to try
	 * @param files the files to upload, we pass the files instead of the FormData as the FormData is a unique object,\
	 * so if one request fail, we cannot use the same FormData object in another request
	 */
	public static async sendData(req: Request, ecs: ExternalConnection[], files: Express.Multer.File[]): Promise<RawFilesUploadStatus> {
		const errors = [];
		for (const ec of ecs) {
			// skip different types
			if (ec.type !== ExternalConnectionType.wordpress) { continue; }

			// create formdata
			const body = new FormData();
			for (const f of files as Express.Multer.File[]) {
				body.append(f.fieldname, f.buffer, { filename: f.originalname })
			}

			// yeet online
			// TODO check that the originUrl contains www.
			// as withouth www. the post doesnt work (probably because it gets redirected to the www. site)
			const [e, d] = await to(HttpRequestService.request(
				'POST', ec.originUrl + WPRemotePaths.raw_files, undefined,
				{
					maxContentLength: Infinity,
					maxBodyLength: Infinity,
					dataRaw: body,
					headers: {'x-api-key': ec.auth.apiKey, ...body.getHeaders()}
				}
			) );
			if (e) { errors.push(e); continue; }
			
			// success, so stop
			const retData: RawFilesUploadStatus['data'] = {};
			for (const k in d.data) {
				retData[k] = WPRawFilesService.remapFileToRawFile(d.data[k]);
			}
			
			return {data: retData, externalConnectionId: ec._id};
		}
		if (errors.length)
			throw errors;
	}

	public static async deleteData(req: Request, ec: ExternalConnection, ids: (number | string)[]): Promise<void> {
		await HttpRequestService.request(
			'DELETE', ec.originUrl + WPRemotePaths.raw_files, {ids},
			{headers: {'x-api-key': ec.auth.apiKey},}
		);
	}

	private static remapFileToRawFile(input: any[]): RawFileInfo[] {
		return input.map(r => ({
			id: r.id,
			name: r.name,
			url: r.url,
			mimeType: r.mime_type,
		}));
	}

}
import React from 'react';
import { TopLevelEditorPart, FetchableField, MediaFile, AbstractEditor, MediaFileService, MediaFileType, AbstractEditorProps, RequestService, ObjectUtils } from "@sixempress/main-fe-lib";
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { FormControl } from "react-reactive-form";
import { Observable } from "rxjs";
import { IBMultiPurposeConfig } from './multip-content.dtd';

abstract class OverrideType<T> extends AbstractEditor<T> { }

export class MultipContentEditor extends OverrideType<IBMultiPurposeConfig> {

	controller = null;
	controllerUrl = BePaths.multipsysteminfocontent;

	requireDocumentLocation = false;
	requireDocumentLocationsFilter = false;

	getEditorConfiguration(): AbstractEditorProps<IBMultiPurposeConfig> {
		return {
			...super.getEditorConfiguration(),
			usePut: true,
			idToModify: "",
		};
	}

	/**
	 * Resolves to undefined when no item was found
	 * Resolves to the ITEM to modify if found
	 */
	protected getEditorRelativeItem(): Observable<IBMultiPurposeConfig> {
		return new Observable(obs => {
			RequestService.client('get', this.controllerUrl, {params: {fetch: this.fieldsToFetch}})
			.then(res => (obs.next(res.data), obs.complete()));
		});
	}

	generateEditorSettings(val: IBMultiPurposeConfig = {} as any): TopLevelEditorPart<IBMultiPurposeConfig>[] {

		return [
			{
				type: 'formControl',
				logic: {
					key: 'logo',
					component: (control) => (
						<>
							<h2>Logo</h2>
							<span>
								{control.value ? "File scelto" : <b className='text-error'>File non scelto</b>}
							</span>
							<br/>
							<input 
								type="file"
								onChange={MultipContentEditor.choseFile(control as FormControl)}
							/>
							{control.value && (
								<img alt='pdf-logo' src={control.value.fetched.content}/>
							)}
						</>
					)
				}
			},
			{type: 'divider'},
			{
				type: 'jsx',
				component: (<h1 style={{margin: 0}}><b>Configurazione PDF</b></h1>)
			},
			{
				type: 'formGroup',
				logic: {
					key: 'pdfInfo',
					parts: [
						{
							type: 'formControl',
							logic: {
								label: 'Righe informative',
								component: 'TextArea',
								key: 'infoRows',
							}
						},
						{
							type: 'formGroup',
							logic: {
								key: 'customerOrder',
								parts: [
									{
										type: 'formControl',
										logic: {
											label: 'Titolo Ordine Cliente',
											component: 'TextField',
											key: 'title',
										}
									},
								]
							}
						},
					]
				}
			},
			{
				type: 'jsx',
				component: (<h3 style={{margin: 0}}><b>Scontrino</b></h3>)
			},
			{
				type: 'formGroup',
				logic: {
					key: 'receiptInfo',
					parts: [
						{
							type: 'formControl',
							logic: {
								label: 'Righe informative',
								component: 'TextArea',
								key: 'infoRows',
							}
						},
						{
							type: "formArray",
							gridProp: {md: 6},
							wrapRender: (r) => <span>Garanzie<br/>{r}</span>,
							logic: {
								key: 'availableWarrancies',
								parts: [{
									type: 'formControl',
									gridProp: {md: 12},
									logic: {
										component: 'TextField',
										label: 'Garanzia',
										key: "",
									}
								}]
							}
						}
					]
				}
			},
		];
	}
	

	private static choseFile = (control: FormControl) => (e?: React.ChangeEvent<HTMLInputElement>) => {

		const file = e.target.files[0];

		// Getting basic file info
		const name = file.name.replace(/\..+$/, '');
		const extension = file.name.match(/\.([a-z]+)$/)[1];
		const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
		
		// Check if the file is allowed
		const allowedExtension = ['png', 'jpeg', 'jpg'];
		if (allowedExtension.indexOf(extension) === -1) {
			return;
		}

		MediaFileService.imageToBase64(file)
		.then(b64 => {
			MediaFileService.resizeDataUrl(b64, 150, 150)
			.then(resized => {

				const mediaFile: MediaFile = {
					content: resized,
					name,
					extension,
					mimeType,
					type: MediaFileType.image,
					documentLocationsFilter: ['*']
				};
		
				control.patchValue(new FetchableField("", "", mediaFile));
			})
			.catch((e) => console.log(e))
		})
		.catch((e) => console.log(e))

	}



	generateToSaveObjectByFormGroup(val: IBMultiPurposeConfig) {
		return new Observable<IBMultiPurposeConfig>(obs => {
		
			// remove
			if (val.receiptInfo) {
				if (!val.receiptInfo.availableWarrancies || val.receiptInfo.availableWarrancies.length === 0) {
					delete val.receiptInfo.availableWarrancies;
				}
			} 

			// update clear and return
			this.updateLogo(val).subscribe(s => {
				this.clearFalsyFields(val);
				if (val.logo) {
					val.logo.id = '';
				}
				obs.next(val);
			});

		});
	}

	/**
	 * Recursevlu clears items
	 */
	private clearFalsyFields(obj: object) {
		for (const k in obj) {
			
			if (obj[k] && typeof obj[k] === 'object') {
				this.clearFalsyFields(obj[k]);
				if (Object.keys(obj[k]).length === 0) {
					delete obj[k];
				}
			}
			else if (!obj[k]) { 
				delete obj[k]; 
			}
		}

	}

	private updateLogo(baseInfo: IBMultiPurposeConfig) {
		return new Observable<IBMultiPurposeConfig>(obs => {

			if (!baseInfo.logo) {
				delete baseInfo.logo;
				obs.next(baseInfo);
				return;
			}

			if (
				// no item
				!this.objFromBe || 
				// no logo on item
				!this.objFromBe.logo ||
				// logo different
				this.objFromBe.logo.fetched.content !== baseInfo.logo.fetched.content
			) {
				baseInfo.logo = new FetchableField("", ModelClass.MediaFile, baseInfo.logo.fetched);

			}
			

			obs.next(baseInfo);
		});
	}

	/**
	 * Returns the send action to use
	 */
	protected async getSendAction(mode: 'POST' | 'PUT' | 'PATCH', toSave: IBMultiPurposeConfig): Promise<any> {
		const diff = !this.objFromBe ? true : ObjectUtils.objectDifference(toSave, this.objFromBe);
		if (diff)
			return RequestService.client('put', this.controllerUrl, {data: toSave});
	}

}

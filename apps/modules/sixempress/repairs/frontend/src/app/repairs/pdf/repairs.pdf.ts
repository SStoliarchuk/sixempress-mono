import { ObjectUtils, TimeService, DataFormatterService } from '@sixempress/main-fe-lib';
import { Repair, DeviceTypeLabel } from "../Repair";
import moment from 'moment';
import { PdfService } from '@sixempress/multi-purpose';
import { MultipService } from '@sixempress/multi-purpose';
import { BarcodeService } from '@sixempress/multi-purpose';
import { ExternalConnService } from '@sixempress/multi-purpose';
import { ExtRedirectType } from '@sixempress/multi-purpose';
import { CodeScannerEventsService, ScannedItemType } from '@sixempress/multi-purpose';
import { CustomerController } from '@sixempress/multi-purpose';
import { RepairController, repairsBarcodePrefix } from '../repair.controller';
import { RepairSettingsService } from '../settings/repair-settings.service';

const createBarcode = (repObj: Repair) => {
	return CodeScannerEventsService.encodeBarcodeType(repairsBarcodePrefix, repObj)
}

export class RepairsPdf {
	
	public static defaultDisclaimer = `Il centro di assistenza non riconosce garanzia alcuna qualora i dispositivi presentino in sede di lavorazione ulteriori difetti non riscontrati al momento dell'accettazione. Le riparazioni sono coperte da un periodo di garanzia di 60 giorni a partire dalla data di ritiro del dispositivo riparato. La garanzia copre solo i componenti sostituiti e non e' piu' valida qualora il dispositivo venga manomesso o venga in esso riscontrato presenza di liquidi, rottura del sigillo di garanzia o effetti dovuti ad urti o cadute. Il dispositivo dovra' essere ritirato, previo pagamento della riparazione, entro 120 giorni dalla conferma di avvenuta riparazione da parte del centro di assistenza. Trascorso tale termine il dispositivo sara' da intendersi di proprieta' del centro di assistenza.\nAi sensi e per gli effetti di cui all'art.1341, secondo comma del Codice Civile il cliente, dopo aver letto ed approvato tutte le condizioni, specificatamente approva le condizioni di cui sopra descritte.`;
	public static defaultEntranceTitle = 'Scheda Accettazione Dispositivo';
	public static defaultInterventTitle = 'Ricevuta non fiscale per Riparazione e/o Vendita';
	public static defaultInterventListTitle = "Riparazioni effettuate";
	
	
	/**
	 * Creates a base64Barcode image
	 * @param id ID of the element to create
	 */
	private static generateEntranceBarcode(repObj: Repair): string {
		return BarcodeService.barcodeToB64(createBarcode(repObj), {
			width: 1,
			height: 13,
			margin: 0,
			displayValue: false,
		});
	}

	public static pdf(action: 'print' | 'download', type: "entrance" | 'exit', repairId: string, downloadName?: string) {
		const obs = type === 'entrance' ? RepairsPdf.generateRepairEntrance(repairId) : RepairsPdf.generateRepairExit(repairId);
		obs.then(dd => {
			PdfService.pdfAction(dd, action, downloadName || "Riparazione");
		});
	}

	public static generateRepairEntrance(repairId: string): Promise<any> {
		return new Promise<any>((r, j) => {

			const bussConf = MultipService.content || {};
			const pdfConfig = bussConf.pdfInfo || {};
			const entrance = RepairSettingsService.config.entrancePdf || {};

			new RepairController().getSingle(repairId, {params: {fetch: [
				...RepairController.getSaleableModelFetchField(),
			]}})
			.then((repairObject: Repair) => {

				const get = (field: string) => {
					const res = ObjectUtils.getValueByDotNotation(repairObject, field);
					if (res === undefined || res === null) {
						return '';
					}
					return res;
				};

				const barcode = RepairsPdf.generateEntranceBarcode(repairObject);

				const headerCols: any[] = [ {
					margin: [0, 0, 0, 0],
					table: {
						widths: ['*'],
						body: [
							[{
								text: {
									text: (entrance.title || RepairsPdf.defaultEntranceTitle) + '\n',
									fontSize: 25,
									alignment: 'center',
									bold: true
								},
								border: [false, false, false, false],
							}],
							[{
								border: [false, false, false, false],
								table: {
									widths: ['100%'],
									body: [[
										{
											text: entrance.infoRows || pdfConfig.infoRows || "",
											margin: [10, 0, 0, 0],
											border: [false, false, false, false]
										},
									]]
								},
							}],
						]
					}
				}];

				if (entrance.logo || bussConf.logo) {
					headerCols.unshift({
						width: 100,
						image: entrance.logo ? entrance.logo.fetched.content : bussConf.logo.fetched.content,
						fit: [100, 100],
					});
				}

				const extRedirectUrl = ExternalConnService.generateDefaultConnectionRedirectsUrl(
					ExtRedirectType.repair,
					repairObject._id,
					createBarcode(repairObject),
				);

				const dd = {
					pageMargins: [20, 20, 20, 40],
					content: [
						// HEADER
						{
							columns: headerCols
						},
						// <hr>
						{
							margin: [0, 10, 0, 5],
							table: {
								widths: ['*'],
								body: [
									[{ text: '', border: [false, true, false, false]}]
								]
							},
							layout: {
								hLineColor: (i, node) => {
									return '#ddd';
								},
							}
						},
						// Info on printed
						!extRedirectUrl ? {} : {
							qr: extRedirectUrl,
							fit: 66,
							border: [false, false, false, false],
							alignment: "right",
						},
						{
							margin: extRedirectUrl ? [0, -25, 0, 10] : [0, 0, 0, 0],
							table: {
								widths: ["auto", "auto", "*", extRedirectUrl ? 70 : 0],
								body: [
									[
										{ 
											text: 'Cod. Riparazione', 
											border: [false, false, false, false], 
											bold: true 
										},
										{ 
											text: repairObject._progCode, 
											bold: true 
										},
										{
											image: barcode,
											fit: [150, 9000],
											alignment: extRedirectUrl ? 'center' : 'right',
											border: [false, false, false, false]
										},
										{
											text: "",
											border: [false, false, false, false],
										},
										// { text: '', border: [false, false, false, false]  },
										// { text: repairObject.estimatedRepairTime ? [{text: 'Tempo riparazione: ', bold: true}, {text: repairObject.estimatedRepairTime}] : '', border: [false, false, false, false]  },
										// { text: DataFormatterService.formatUnixDate(repairObject.date), border: [false, false, false, false], bold: true}
									]
								]
							}
						},
						// repair info
						{
							margin: [0, 10, 0, 0],
							table: {
								widths: [105, '*'],
								body: [
									[
										{ text: 'Cliente:', bold: true, border: [false, false, false, true] },
										{ text: repairObject.customer.fetched.name, border: [false, false, false, true] }
									],
									[
										{ text: '', border: [false, false, false, false] },
										{ text: '', border: [false, false, false, false] }
									],
								]
							},
							layout: {
								hLineColor: (i, node) => {
									return '#ddd';
								},
							}
						},
						{
							margin: [0, 0, 0, 0],
							table: {
								widths: [105, 153, 'auto', '*'],
								body: [
									[
										{ text: 'Prodotto:', bold: true, border: [false, false, false, true] },
										{ text: DeviceTypeLabel[repairObject.deviceType], border: [false, false, false, true] },
										{ text: 'Marca e Modello:', bold: true, border: [false, false, false, true] },
										{ text: repairObject.model, border: [false, false, false, true] }
									],
									[
										{ text: '', border: [false, false, false, false] },
										{ text: '', border: [false, false, false, false] },
										{ text: '', border: [false, false, false, false] },
										{ text: '', border: [false, false, false, false] }
									],
									[
										{ text: 'Accessori correlati:', bold: true, border: [false, false, false, true] },
										{ text: get('accessories'), border: [false, false, false, true] },
										{ text: 'Preventivo:', bold: true, border: [false, false, false, true] },
										{ text: get('totalPrice') ? '€ ' + DataFormatterService.centsToScreenPrice(get('totalPrice')) : '', border: [false, false, false, true] }
									],
									[
										{ text: '', border: [false, false, false, false] },
										{ text: '', border: [false, false, false, false] },
										{ text: '', border: [false, false, false, false] },
										{ text: '', border: [false, false, false, false] },
									],
								]
							},
							layout: {
								hLineColor: (i, node) => {
									return '#ddd';
								},
							}
						},
						{
							margin: [0, 0, 0, 0],
							table: {
								widths: ['50%', '50%'],
								body: [
									[
										{ text: 'Difetti dichiarati:', bold: true, border: [false, false, false, false] },
										{ text: 'Difetti visibili:', bold: true, border: [false, false, false, false] }
									],
									[
										{ text: repairObject.defects, border: [false, false, false, true] },
										{ text: get('visibleDefects'), border: [false, false, false, true] }
									],
									[
										{ text: '', border: [false, false, false, false] },
										{ text: '', border: [false, false, false, false] },
									]
								]
							},
							layout: {
								hLineColor: (i, node) => {
									return '#ddd';
								},
							}
						},
						// fine print
						{
							margin: [0, 15, 0, 10],
							text: entrance.disclaimer || pdfConfig.disclaimer || RepairsPdf.defaultDisclaimer,
							alignment: 'center',
							fontSize: 9,
							bold: true
						},
						// cut mark
						{
							margin: [0, 15, 0, 10],
							table: {
								widths: ['*'],
								body: [
										[{ text: '', border: [false, true, false, false]}]
									]
							},
							layout: {
								hLineColor: (i, node) => {
									return '#ddd';
								},
								hLineStyle: (i, node) => {
									return {dash: {length: 4}};
								},
							}
						},
							// Info on printed
						{
							layout: 'noBorders',
							table: {
								widths: [60, 'auto', '*'],
								body: [
									[{
										qr: createBarcode(repairObject),
										fit: 60,
									}, {
										layout: 'noBorders',
										table: {
											widths: ['auto'],
											body: [
												[{
													image: barcode,
													fit: [150,9000],
													margin:[0,-2,0,0],
													border: [false, false, false, false]
												}],
												[{
													margin: [-5,0,0,-3],
													table: {body: [[{text: 'Cod. riparazione', border: [false, false, false, false]}, {text: repairObject._progCode}]]}
												}],
												[{
													text: DataFormatterService.formatUnixDate(repairObject.date),
												}]
											]
										}
									}, {
										text: repairObject.estimatedRepairTime ? "Riparato entro: " + DataFormatterService.formatUnixDate(repairObject.estimatedRepairTime) : "",
										bold: true,
										alignment: 'right',
										fontSize: 18,
										// { text: repairObject.estimatedRepairTime ? [{text: 'Tempo riparazione: ', bold: true}, {text: repairObject.estimatedRepairTime}] : '', border: [false, false, false, false]  },
										// { text: DataFormatterService.formatUnixDate(repairObject.date), border: [false, false, false, false], bold: true}
									}]
								]
							}
						},
						// repair info
						{
							margin: [0, 20, 0, 0],
							table: {
								widths: [100, '*', 'auto'],
								body: [
									[
										{
											text: 'Cliente',
											bold: true,
											border: [false, false, false, true]
										},
										{
											text: CustomerController.formatCustomerName(repairObject.customer.fetched),
											border: [false, false, false, true]
										},
										{
											text: [{text: 'N.Tel: ', bold: true}, {text: repairObject.customer.fetched.phone}],
											border: [false, false, false, true]
										}
									],
								]
							},
							layout: {
								hLineColor: (i, node) => {
									return '#ddd';
								},
							}
						},
						{
							margin: [0, 0, 0, 0],
							table: {
								widths: [101, 158, 'auto', '*'],
								body: [
									[
										{ text: 'Prodotto', bold: true, border: [false, false, false, true] },
										{ text: DeviceTypeLabel[repairObject.deviceType], border: [false, false, false, true] },
										{ text: 'Marca e modello', bold: true, border: [false, false, false, true] },
										{ text: repairObject.model, border: [false, false, false, true] }
									],
									[
										{ text: 'Colore', bold: true, border: [false, false, false, true] },
										{ text: repairObject.color, border: [false, false, false, true] },
										{ text: 'Cod. Sblocco', bold: true, border: [false, false, false, true] },
										{ text: get('deviceCode'), border: [false, false, false, true] }
									],
									[
										{ text: 'Accessori correlati', bold: true, border: [false, false, false, true] },
										{ text: get('accessories'), border: [false, false, false, true] },
										{ text: 'Preventivo', bold: true, border: [false, false, false, true] },
										{ text: get('totalPrice') ? '€ ' + DataFormatterService.centsToScreenPrice(get('totalPrice')) : '', border: [false, false, false, true] }
									],
								]
							},
							layout: {
								hLineColor: (i, node) => {
									return '#ddd';
								},
							}
						},
						{
							margin: [0, 0, 0, 0],
							table: {
								widths: ['50%', '50%'],
								body: [
									[
										{ text: 'Difetti dichiarati', bold: true, border: [false, false, false, false] },
										{ text: 'Difetti visibili', bold: true, border: [false, false, false, false] }
									],
									[
										{ text: repairObject.defects, border: [false, false, false, true] },
										{ text: get('visibleDefects'), border: [false, false, false, true] }
									],
								]
							},
							layout: {
								hLineColor: (i, node) => {
									return '#ddd';
								},
							}
						},
						{
							margin: [0, 0, 0, 0],
							table: {
								widths: ['auto', '*'],
								body: [
									[
										{ text: 'Note', bold: true, border: [false, false, false, false] },
										{ text: get('notes'), border: [false, false, false, false] }
									]
								]
							},
						},
					],
					footer: [{
						margin: [20, 0, 20, 0],
						table: {
							widths: ['*', 'auto'],
							body: [
								[{text: '', border: [false, false, false, false]}, {text: 'Firma per presa visione ed accettazione', border: [false, true, false, false]}]
							],
						}
					}],
				};

				r(dd);
			});

		});
	}

	public static generateRepairExit(repairId: string): Promise<any> {
		return new Promise<any>((r, j) => {

			const bussConf = MultipService.content || {};
			const pdfConfig = bussConf.pdfInfo || {};
			const interrvent = RepairSettingsService.config.interventPdf || {};

			new RepairController().getSingle(repairId, {params: {fetch: [{field: 'customer'}]}})
			.then((repairObject: Repair) => {

				const get = (field: string) => {
					const res = ObjectUtils.getValueByDotNotation(repairObject, field);
					if (res === undefined || res === null) {
						return '';
					}
					return res;
				};

				const headerCols: any[] = [{
					margin: [20, 0, 0, 0],
					text: [{
						text: (interrvent.title || RepairsPdf.defaultInterventTitle) + '\n',
						fontSize: 19,
						alignment: 'center',
						bold: true,
					}, {
						text: '\n',
						fontSize: 10,
					}, {
						text: interrvent.infoRows || pdfConfig.infoRows || '',
						fontSize: 12,
					}],
					width: 450,
				}];

				if (interrvent.logo || bussConf.logo) {
					headerCols.unshift({
						width: 100,
						image: interrvent.logo ? interrvent.logo.fetched.content : bussConf.logo.fetched.content,
						fit: [100, 100],
					});
				}

				const timeUnixToUse = repairObject._opReportLastAuthor 
					? repairObject._opReportLastAuthor._timestamp 
					: repairObject.endDate || TimeService.getCorrectMoment().unix();

				const dd = {
					pageMargins: [20, 20, 20, 100],
					footer: [
							// fine print
							{
								margin: [20, 0, 20, 10],
								text: interrvent.disclaimer || pdfConfig.disclaimer || RepairsPdf.defaultDisclaimer,
								alignment: 'center',
								fontSize: 9,
								bold: true
							},
					],
					content: [
							// HEADER
							{
								columns: headerCols
							},
							// <hr>
							{
								margin: [0, 15, 0, 10],
								table: {
										widths: ['*'],
										body: [
												[{ text: '', border: [false, true, false, false]}]
											]
								},
								layout: {
									hLineColor: (i, node) => {
										return '#ddd';
									},
								}
							},
							// Info on printed
							{
								table: {
									widths: ['auto', 'auto', '*', 'auto'],
									body: [
										[
											{ text: 'Cod. Riparazione', border: [false, false, false, false], bold: true},
											{ text: repairObject._progCode , bold: true},
											{ text: '', border: [false, false, false, false]},
											{ text: moment(timeUnixToUse * 1000).format('DD/MM/YYYY - HH:mm'), border: [false, false, false, false], bold: true}
										]
									]
								}
							},
							// repair info
							{
								margin: [0, 30, 0, 10],
								table: {
									widths: ['auto', '*'],
									body: [
										[
											{ text: 'Cliente', bold: true, border: [false, false, false, true]},
											{ text: repairObject.customer.fetched.name, border: [false, false, false, true]}
										],
										[{text: '', border: [false, false, false, false]}, {text: '', border: [false, false, false, false]}],
										[{text: '', border: [false, false, false, false]}, {text: '', border: [false, false, false, false]}],
										[
											{ text: 'Prodotto', bold: true, border: [false, false, false, true]},
											{ text: DeviceTypeLabel[repairObject.deviceType], border: [false, false, false, true]}
										],
										[{text: '', border: [false, false, false, false]}, {text: '', border: [false, false, false, false]}],
										[{text: '', border: [false, false, false, false]}, {text: '', border: [false, false, false, false]}],
										[
											{ text: 'Marca e Modello', bold: true, border: [false, false, false, true]},
											{ text: repairObject.model, border: [false, false, false, true]}
										],
										[{text: '', border: [false, false, false, false]}, {text: '', border: [false, false, false, false]}],
										[{text: '', border: [false, false, false, false]}, {text: '', border: [false, false, false, false]}],
										[
											{ text: 'Difetti dichiarati', bold: true, border: [false, false, false, true]},
											{ text: repairObject.defects, border: [false, false, false, true]}
										],
										[{text: '', border: [false, false, false, false]}, {text: '', border: [false, false, false, false]}],
										[{text: '', border: [false, false, false, false]}, {text: '', border: [false, false, false, false]}],
										[
											{ text: 'Difetti visibili', bold: true, border: [false, false, false, true]},
											{ text: get('visibleDefects'), border: [false, false, false, true]}
										],
										[{text: '', border: [false, false, false, false]}, {text: '', border: [false, false, false, false]}],
										[{text: '', border: [false, false, false, false]}, {text: '', border: [false, false, false, false]}],
										[
											{ text: 'Accessori correlati', bold: true, border: [false, false, false, true]},
											{ text: get('accessories'), border: [false, false, false, true]}
										],
										[{text: '', border: [false, false, false, false]}, {text: '', border: [false, false, false, false]}],
										[{text: '', border: [false, false, false, false]}, {text: '', border: [false, false, false, false]}],
										[
											{ text: 'Preventivo', bold: true, border: [false, false, false, true]},
											{ text: get('totalPrice') ? '€ ' + DataFormatterService.centsToScreenPrice(get('totalPrice')) : '', border: [false, false, false, true]}
										],
									],
								},
								layout: {
									hLineColor: (i, node) => {
										return '#ddd';
									},
								}
							},
							// operations
							{
								margin: [0, 15, 0, 20],
								text: (interrvent.interventTitle || RepairsPdf.defaultInterventListTitle),
								bold: true,
								fontSize: 20,
							},
							{
								margin: [15, 0, 0, 0],
								text: repairObject.opReport
							}
						]
				};
				r(dd);
			});
		});
	}


}

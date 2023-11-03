import { DataFormatterService } from '@sixempress/main-fe-lib';
import { CustomerAppointment, CustomerAppointmentStatusLabel } from './CustomerAppointment';
import { Observable } from 'rxjs';
import { CustomerAppointmentController } from './customer-appointment.controller';
import { MultipService, PdfService } from '@sixempress/multi-purpose';

export class CustomerAppointmentPdf {


	public static printOrder(objInfo: string) {
		CustomerAppointmentPdf.generatedOrderDD(objInfo).subscribe(dd => {
			PdfService.pdfAction(dd, 'print');
		});
	}

	/**
	 * @param objInfo _id of the order || the order object itself
	 */
	public static generatedOrderDD(objInfo: string): Observable<object> {
		return new Observable(obs => {
			
				new CustomerAppointmentController().getSingle(
					objInfo, 
					{params: {fetch: [
						{field: 'customer'},
						...CustomerAppointmentController.getSaleableModelFetchField(),
					]}},
				).then(obj => {
				
				const bussConfig = MultipService.content; 
				const calculatedTotal = CustomerAppointmentController.getTotal(obj, 'calculated');
	
				const dd = {
					pageMargins: [20, 20, 20, 70],
					footer: [
						// fine print
						calculatedTotal === obj.totalPrice ? {} : {
							margin: [0, 0, 20, 0],
							text: "Tot. Calcolato: € " + DataFormatterService.centsToBigNumber(calculatedTotal),
							fontSize: 15,
							// bold: true,
							decoration: "lineThrough",
							alignment: "right",
						},
						{
							margin: [0, 0, 20, 0],
							text: "Tot. Scontato: € " + DataFormatterService.centsToBigNumber(obj.totalPrice),
							fontSize: 19,
							bold: true,
							alignment: "right",
						},
					],
					content: [
							// HEADER
							{
								columns: [!bussConfig.logo ? {} : {
									width: 100,
									image: bussConfig.logo.fetched.content,
									fit: [100, 100],
								}, {
									margin: [20, 0, 0, 0],
									text: [{
										text: "Resoconto Intervento \n",
										fontSize: 19,
										alignment: 'center',
										bold: true,
									}, {
										text: '\n',
										fontSize: 10,
									}],
									width: 450,
								}]
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
							// general info
							{
								margin: [0, 0, 0, 10],
								table: {
									widths: ['auto', '*'],
									body: [
										[
											{ text: 'Cliente', bold: true, border: [false, false, false, true]},
											{ text: obj.customer.fetched.name, border: [false, false, false, true]}
										],
										[{text: '', border: [false, false, false, false]}, {text: '', border: [false, false, false, false]}],
										[{text: '', border: [false, false, false, false]}, {text: '', border: [false, false, false, false]}],
										[
											{ text: 'Inizio', bold: true, border: [false, false, false, true]},
											{ text: DataFormatterService.formatUnixDate(obj.date), border: [false, false, false, true]}
										],
										[{text: '', border: [false, false, false, false]}, {text: '', border: [false, false, false, false]}],
										[{text: '', border: [false, false, false, false]}, {text: '', border: [false, false, false, false]}],
										[
											{ text: 'Fine', bold: true, border: [false, false, false, true]},
											{ text: obj.endDate ? DataFormatterService.formatUnixDate(obj.endDate) : "", border: [false, false, false, true]}
										],
										[{text: '', border: [false, false, false, false]}, {text: '', border: [false, false, false, false]}],
										[{text: '', border: [false, false, false, false]}, {text: '', border: [false, false, false, false]}],
										[
											{ text: 'Pagamento', bold: true, border: [false, false, false, true]},
											{ text: CustomerAppointmentStatusLabel[obj.status], border: [false, false, false, true]}
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
								text: ("Dettagli"),
								bold: true,
								fontSize: 20,
							},
							...CustomerAppointmentController.generatePdfTable(obj, false),
						]
					};
				obs.next(dd);
			});
		});
	}


}

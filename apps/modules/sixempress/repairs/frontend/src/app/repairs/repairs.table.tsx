import React from 'react';
import { Repair, RepairStatusLabel, DeviceTypeLabel, CustomerNoticeLabel, RepairStatus } from "./Repair";
import { ComponentCommunicationService, AbstractBasicDt, ICustomDtSettings, SmallUtils, DtFiltersSetting, DataFormatterService, TableVariation, ABDTProps, ABDTAdditionalSettings, ConfirmModalComponent, LibSmallUtils } from '@sixempress/main-fe-lib';
import { Attribute } from '../../enums/attributes';
import { BePaths as MultipBePaths } from '@sixempress/multi-purpose';
import { checkRepairForDelivery } from "./modals/check-repair-for-delivery.dialog";
import { RepairsPdf } from "./pdf/repairs.pdf";
import { RepairController } from "./repair.controller";
import { CustomerController } from '@sixempress/multi-purpose';
import { openReceiptModal } from '@sixempress/multi-purpose';
import { SaleStatus } from '@sixempress/multi-purpose';
import { MultipUserController } from '@sixempress/multi-purpose';

export interface RTProps extends ABDTProps<Repair> {
	showNotDeliveredOnly?: true,
}

export class RepairsTable extends AbstractBasicDt<Repair, RTProps> {

	controller = new RepairController();

	componentDidMount() {
		super.componentDidMount();

		if (this.props.showNotDeliveredOnly) {
			this.setState({dtFiltersComponentValue: {endDate: {$exists: false}}});
		}
		
		const dtFilterData: {time: any} = ComponentCommunicationService.getData('dt-filters');
		if (dtFilterData) {
			this.setState({dtFiltersComponentValue: dtFilterData});
		}

		const data: {time: any, objPath: 'endDate'} = ComponentCommunicationService.getData('from-dashboard') || {};
	
		// activate the filters at the generation of the page if there is data given
		if (data.time) {
			if (data.objPath) {
				this.setState({dtFiltersComponentValue: {'endDate': {$gte: data.time.from, $lte: data.time.to}}});
			} else {
				this.setState({dtFiltersComponentValue: {'date': {$gte: data.time.from, $lte: data.time.to}}});
			}
		}
	}

	additionalSettings: ABDTAdditionalSettings<Repair> = { 
		toFetch: [{field: "customer", projection: {name: 1, _progCode: 1, lastName: 1}}],
		projection: {'endDate': 1},
	};

	defaultAvailableTables: TableVariation[] = [
		{
			name: "Da completare",
			filters: {
				endDate: {$exists: false},
				status: {$in: [RepairStatus.entry, RepairStatus.waiting, RepairStatus.working]},
			}
		},
		{
			name: "Da consegnare",
			filters: {
				endDate: {$exists: false},
				status: {$in: [RepairStatus.exitSuccess, RepairStatus.exitFailure]},
			}
		},
	];

	filterSettings: DtFiltersSetting<Repair> = {
		timeFields: [{
			label: "Entrata",
			modelPath: "date",
		}, {
			label: 'Data di consegna',
			modelPath: 'endDate',
		}, {
			label: 'Scadenza',
			modelPath: 'estimatedRepairTime',
		}],
		addCreationTimeFilter: false,
		selectFields: [{
			label: 'Stato',
			modelPath: 'status',
			multiple: true,
			availableValues: Object.values(RepairStatusLabel).filter(i => typeof i === 'number').map(i => ({value: i, label: RepairStatusLabel[i]}))
		}, {
			label: 'Comunicazione',
			modelPath: 'customerNotice',
			multiple: true,
			availableValues: Object.values(CustomerNoticeLabel).filter(i => typeof i === 'number').map(i => ({value: i, label: CustomerNoticeLabel[i]}))
		}, {
			modelPath: 'endDate',
			label: 'Consegnato',
			availableValues: [{
				label: 'Non consegnato',
				value: {$exists: false}
			}, {
				label: 'Consegnato',
				value: {$exists: true}
			}]
		}, {
			modelPath: 'estimatedRepairTime',
			label: 'Scadenza',
			availableValues: [{
				label: 'Nessuna',
				value: {$exists: false}
			}, {
				label: 'Presente',
				value: {$exists: true}
			}]
		}, {
			label: 'Dispositivo',
			modelPath: 'deviceType',
			multiple: true,
			availableValues: Object.values(DeviceTypeLabel).filter(i => typeof i === 'number').map(i => ({value: i, label: DeviceTypeLabel[i]}))
		}],
		amtsFields: [{
			modelPath: 'customer',
			renderValue: CustomerController.formatCustomerName,
			amtsInput: {
				bePath: MultipBePaths.customers,
				infoConf: {
					columns: [{
						title: 'Cod.',
						data: '_progCode',
						searchOptions: {
							castToInt: true
						}
					}, {
						title: 'Nome',
						data: 'name',
					}, {
						title: 'N. Tel',
						data: 'phone'
					}]
				},
			},
			textFieldProps: {
				label: "Cliente",
			}
		}, {
			modelPath: 'assignedTo',
			renderValue: MultipUserController.formatName,
			amtsInput: {
				bePath: MultipBePaths.userlist,
				infoConf: {
					columns: [{
						title: 'Cod.',
						data: '_progCode',
						searchOptions: {
							castToInt: true
						}
					}, {
						title: 'Nome',
						data: 'name',
					}, {
						title: 'Username',
						data: 'username'
					}]
				},
			},
			textFieldProps: {
				label: "Operatore Assegnato",
			}
		}]
	};


	protected getDtOptions(): ICustomDtSettings<Repair> {
		const toR: ICustomDtSettings<Repair> = {
			buttons: [
				{
					title: 'Aggiungi',
					attributes: { required: [Attribute.addRepairs] },
					onClick: () => this.openEditor()
				},
				{
					title: 'Modifica',
					attributes: { required: [Attribute.modifyRepairs] },
					select: { type: "single", },
					onClick: (event, dt) => this.openEditor(dt),
				},
				{
					title: 'Elimina',
					props: {color: 'secondary'},
					attributes: { required: [Attribute.deleteRepairs] },
					select: { type: "single", },
					onClick: (e, dt) => this.sendDeleteRequest(dt)
				},
				{
					title: 'Lavorazioni',
					attributes: { required: [Attribute.modifyRepairs] },
					select: {type: 'single', },
					onClick: (event, dt) => this.relativeNavigation('/operations/' + this.getRowData(dt)._id),
					// attributes: { required: [Attribute.Worker] }
				},
				{
					title: 'Stampa',
					select: { type: 'single', },
					type: {
						name: "menuSingle",
						items: [
							{ title: 'Accettazione', onClick: (event, dt) => RepairsPdf.pdf('print', 'entrance', this.getRowData(dt)._id) },
							{ title: 'Rapp. Intervento', onClick: (event, dt) => RepairsPdf.pdf('print', 'exit', this.getRowData(dt)._id) },
						]
					}
				},
				{
					title: 'Scarica',
					select: { type: 'single', },
					type: {
						name: "menuSingle",
						items: [
							{ title: 'Accettazione', onClick: (event, dt) => RepairsPdf.pdf('download', 'entrance', this.getRowData(dt)._id) },
							{ title: 'Rapp. Intervento', onClick: (event, dt) => RepairsPdf.pdf('download', 'exit', this.getRowData(dt)._id) },
						]
					},
					hideDisabled: true,
				},
				{
					title: 'Consegna ora',
					attributes: { required: [Attribute.modifyRepairs] },
					select: { type: "single", enabled: (model) => Boolean(!model.endDate) },
					hideDisabled: true,
					onClick: (event, dt) => {
						const repair: Repair = this.getRowData(dt);
						checkRepairForDelivery(repair).subscribe(rep => {
							if (!rep) 
								return;
								
							LibSmallUtils.notify( 'Consegnato con successo', "success" ); 
							this.reloadTable(); 
						});
					}
				},
				{
					title: 'Scontrino',
					select: {type: 'single', enabled: (model) => Boolean(model.endDate), },
					onClick: async (event, dt) => {
						const model = await this.controller.getSingle(this.getRowData(dt)._id, {params: {fetch: this.controller.getFullFetch()}});
						openReceiptModal({
							forcePassedSale: true,
							payments: model.status === RepairStatus.deliveredWillPay,
							sale: {
								...model,
								status: SaleStatus.success,
								list: [{
									manual: [{
										description: 'Cod Rip. N.: ' + model._progCode,
										sellPrice: model.totalPrice,
										buyPrice: 0,
									}]
								}],
							}
						})
					},
				},
				{
					title: 'Annulla Consegna',
					attributes: { required: [Attribute.modifyRepairs] },
					select: { type: "single", enabled: (model) => Boolean(model.endDate) },
					hideDisabled: true,
					onClick: (event, dt) => {
						const repair: Repair = this.getRowData(dt);
						ConfirmModalComponent.open('Annulla Consegna #' + repair._progCode, 'Sicuro di voler annullare questa consegna?', r => {
							if (!r)
								return;

							new RepairController().patch(repair._id, [{op: 'set', path: 'status', value: RepairStatus.reEntered}])
							.then(r => {
								LibSmallUtils.notify( 'Consegna annullata', "success" ); 
								this.reloadTable(); 
							})
						})
					}
				},
			],
			columns: [
				{
					title: 'C.R',
					data: '_progCode',
					search: {
						regex: false,
						toInt: true
					}
				},
				{
					title: 'Cliente',
					data: 'customer.fetched.name',
					render: (c, row) => CustomerController.formatCustomerName(row.customer.fetched),
					search: {manual: v => CustomerController.createCustomerNameQuery(v, 'customer.fetched')},
				},
				{
					title: 'Dispositivo',
					data: 'deviceType',
					render: (data) => DeviceTypeLabel[data]
				},
				{
					title: 'Modello',
					data: 'model'
				},
				{
					title: 'Consegnato',
					data: 'endDate',
					search: false,
					render: (data) => data ? DataFormatterService.formatUnixDate(data) : ''
				},
				{
					title: 'Scadenza',
					data: 'estimatedRepairTime',
					search: false,
					render: (data) => data ? DataFormatterService.formatUnixDate(data) : ''
				},
				{
					title: 'Preventivo',
					data: 'totalPrice',
					search: false,
					render: (data) => data ? '€ ' + DataFormatterService.centsToScreenPrice(data) : ''
				},
				{
					title: 'Stato',
					data: 'status',
					search: false,
					render: (status) => RepairStatusLabel[status]
				},
				{
					title: 'Comunicazione',
					data: 'customerNotice',
					search: false,
					render: (data) => CustomerNoticeLabel[data]
				},
			],
			renderDetails: (item) => <RepairController.FullDetailJsx id={item._id}/>,
			// renderDetails: (item) => new RepairController().renderFullObjectDetails(item._id).pipe(map(j => ReactDOMServer.renderToString(j.jsx))),
		};


		return toR;
	}

}

import { SaleAnalysis, SaleAnalysisStatus, SaleAnalysisStatusLabel } from './SaleAnalysis';
import { AbstractBasicDt, BusinessLocationsService, ABDTProps, DataFormatterService, DtFiltersSetting, ICustomDtSettings, IUserFilter, ABDTAdditionalSettings, TableVariation, } from '@sixempress/main-fe-lib';
import { getModelClassLabel } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { SaleAnalysisController } from './SaleAnalysis.controller';
import { CustomerController } from '../customers/customer.controller';

export interface SATProps extends ABDTProps<SaleAnalysis> {
	embedReportTemp?: true,
	defaultFilters?: IUserFilter,
}

export class SaleAnalysisTable extends AbstractBasicDt<SaleAnalysis, SATProps> {

	constructor(p) {
		super(p);

		const o = this.toolbarAddition;
		this.toolbarAddition = () => this.props.embedReportTemp ? null : o();
	}

	componentDidMount() {
		if (this.props.defaultFilters)
			this.setState({dtFiltersComponentValue: this.props.defaultFilters});

		super.componentDidMount();

		if (this.props.embedReportTemp)
			this.setState({availableTables: []});
	}

	controller = new SaleAnalysisController();

	defaultAvailableTables: TableVariation[] = [{
		name: 'Da Pagare',
		filters: {status: {$in: [SaleAnalysisStatus.successPrePay]}},
	}];

	additionalSettings: ABDTAdditionalSettings<SaleAnalysis> = { 
		projection: {'_generatedFrom': 1},
		searchFields: [
			{data: 'list.products.item.fetched.groupData.name'},
			{data: 'list.products.item.fetched.groupData.uniqueTags'},
		],
	};

	filterSettings: DtFiltersSetting<SaleAnalysis> = {
		addCreationTimeFilter: false,
		timeFields: [{
			label: "Entrata",
			modelPath: "date",
		}, {
			label: "Termine",
			modelPath: "endDate",
		}],
		selectFields: [{
			label: 'Stato',
			modelPath: 'status',
			multiple: true,
			availableValues: Object.values(SaleAnalysisStatusLabel).filter(i => typeof i === 'number').map(i => ({value: i, label: SaleAnalysisStatusLabel[i]}))
		}],
		amtsFields: [{
			modelPath: 'customer',
			textFieldProps: { label: 'Cliente' },
			...CustomerController.AmtsFieldProps(),
		}],
	}

	protected getModelClassName(s: SaleAnalysis) {
		return getModelClassLabel()[s._generatedFrom.modelClass];
	}

	protected getDtOptions(): ICustomDtSettings<SaleAnalysis> {
		return {
			initialSort: {column: 2, dir: 'desc'},
			buttons: this.props.embedReportTemp ? [] : [
				// {
				// 	title: 'Dettagli',
				// 	select: { type: "single", },
				// 	onClick: (event, dt) => {
				// 		// this.openEditor(dt);
				// 	}
				// },
			],
			columns: [
				{
					title: 'Codice',
					data: '_progCode',
					render: (p, m) => m._progCode + ' | ' + this.getModelClassName(m),
				},
				{
					title: 'Data',
					data: 'date',
					render: (v) => DataFormatterService.formatUnixDate(v),
				},
				{
					title: 'Data Termine',
					data: 'endDate',
					render: (v) => v ? DataFormatterService.formatUnixDate(v) : '',
				},
				{
					title: 'Cliente',
					data: 'customer.fetched.name',
					render: (c, row) => CustomerController.formatCustomerName(row.customer?.fetched),
					search: {manual: v => CustomerController.createCustomerNameQuery(v, 'customer.fetched')},
				},
				{
					title: 'Stato',
					data: 'status',
					render: (v) => SaleAnalysisStatusLabel[v],
				},
				{
					title: 'Totale',
					data: 'totalPrice',
					render: (v) => DataFormatterService.centsToBigNumber(v),
				},
				{
					title: 'Da Pagare',
					data: '_priceMeta.left',
					render: (v) => DataFormatterService.centsToBigNumber(v),
				},
				{
					title: 'Netto',
					data: '_priceMeta.net',
					render: (v) => (v > 0 ? '' : '-') + DataFormatterService.centsToBigNumber(Math.abs(v)),
				},
				{
					title: 'Posizione',
					data: 'physicalLocation',
					render: (v) => BusinessLocationsService.getNameById(v),
				},
			],
			renderDetails: (item) => <SaleAnalysisController.FullDetailJsx id={item._id}/>,
		};
	}

}
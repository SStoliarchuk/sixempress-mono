import React from 'react';
import { AbstractBasicDt, ICustomDtSettings, ModalService, FieldsFactory, TimeService, DataFormatterService, DtFiltersSetting, ABDTAdditionalSettings,  FetchableField, ABDTProps } from '@sixempress/main-fe-lib';
import { AuthService } from '@sixempress/abac-frontend';
import { getModelClassLabel } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { Movement, MovementDirection, MovementDirectionLabel, MovementMediumLabel, MovementMedium } from "../Movement";
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import moment from 'moment';
import { MovementsUtils } from '../movements-utils';
import { MovementController } from '../movement.controller';
import { Customer } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/customers/Customer';
import { CustomerController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/customers/customer.controller';

interface MTProps extends ABDTProps<Movement> {
	embedReportTemp?: boolean
	defaultFilters?: any,
}

export class MovementsTable extends AbstractBasicDt<Movement, MTProps> {

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

	controller = new MovementController();

	additionalSettings: ABDTAdditionalSettings<Movement> = {
		toFetch: [
			{field: '_generatedFrom', projection: {_progCode: 1, customer: 1}}, 
			{field: '_generatedFrom.fetched.customer', projection: {_progCode: 1, name: 1, lastName: 1}},
		],
		projection: {
			['_generatedFrom' as any]: 1,
		}
	}
	// TODO set the multi-select filter, then close then reapon. it will error...

	filterSettings: DtFiltersSetting<Movement> = {
		addCreationTimeFilter: false,
		timeFields: [{
			label: "Data movimento",
			modelPath: 'date',
		}],
		selectFields: [{
			availableValues: Object.values(MovementDirectionLabel).filter(i => typeof i === 'number').map(i => ({value: i, label: MovementDirectionLabel[i]})),
			label: "Direzione",
			modelPath: 'direction',
			multiple: true,
		}]
	}

	protected getDtOptions(): ICustomDtSettings<Movement> {
		return {
			buttons: this.props.embedReportTemp ? [] : [
				{
					title: 'Aggiungi',
					attributes: {required: [Attribute.addMovements]},
					onClick: () => {
						this.openEditor();
					}
				},
				{
					title: 'Modifica',
					select: { type: "single", enabled: (m) => !Boolean(m._generatedFrom) },
					attributes: {required: [Attribute.modifyMovements]},
					onClick: (event, dt) => {
						this.openEditor(dt);
					}
				},

				!AuthService.isAttributePresent(Attribute.viewHiddenMovements) 
					? {
						title: 'Stampa',
						onClick: () => MovementsUtils.printTable(TimeService.getCorrectMoment().startOf('d').unix(), TimeService.getCorrectMoment().endOf('d').unix()),
					}
					: {
						title: 'Stampa',
						type: {
							name: 'menuSingle',
							items: [
								{ title: 'Giornaliero', onClick: (event, dt) => {
									const modal = ModalService.open(
										PrintMovementsDialog, 
										{printFn: (start: number, end: number) => {
											modal.close();
											MovementsUtils.printTable(start, end);
										}},
										{PaperProps: {style: {margin: 0}}}
									);
								} },
								{ title: 'Intervallo', onClick: (event, dt) => {
									const modal = ModalService.open(PrintTimeframeMovementDialog, 
										{printFn: (start: number, end: number) => {
											modal.close();
											MovementsUtils.printTable(start, end);
										}}
									);
								} },
							],
						},
					},
				{
					title: 'Elimina',
					props: {color: 'secondary'},
					attributes: { required: [Attribute.deleteMovements], },
					select: { type: "single", enabled: (m) => !Boolean(m._generatedFrom) },
					onClick: (e, dt) => this.sendDeleteRequest(dt)
				},
			],
			columns: [
				{
					title: 'Data',
					data: 'date',
					render: (data) => DataFormatterService.formatUnixDate(data)
				},
				{
					title: 'Denaro',
					data: 'priceAmount',
					render: (data, model: Movement) => '€ ' + DataFormatterService.centsToScreenPrice(data) + (model.medium === MovementMedium.card ? ' POS' : '')
				},
				{
					title: 'Direzione',
					data: 'direction',
					render: (data: MovementDirection) => {
						if (data === MovementDirection.input) {
							return <Typography color='primary'>{MovementDirectionLabel[data]}</Typography>
						} else if (data === MovementDirection.output) {
							return <Typography color='secondary'>{MovementDirectionLabel[data]}</Typography>
						} else {
							return MovementDirectionLabel[data];
						}
					}
				},
				{
					title: 'Tipo',
					data: 'medium',
					render: (c) => c ? MovementMediumLabel[c] : ''
				},
				{
					title: 'Descrizione',
					data: 'description',
					render: (d, m) => {
						if (m.description)
							return m.description;

						if (m._generatedFrom && m._generatedFrom.fetched) {
								let r = m._generatedFrom.fetched._progCode 
									? m._generatedFrom.fetched._progCode + ' | ' + getModelClassLabel()[m._generatedFrom.modelClass]
									: getModelClassLabel()[m._generatedFrom.modelClass];

								if (m._generatedFrom.fetched.customer)
									r += ' (' + CustomerController.formatCustomerName(m._generatedFrom.fetched.customer as FetchableField<Customer>) + ')';

								return r;
						}

						return '';
					},
				},
			],
			renderDetails: (item) => <MovementController.FullDetailJsx id={item._id}/>
		};
	}


}

/**
 * A dialog that let the user chose a date for the print
 */
function PrintMovementsDialog(props: {printFn: (start: number, end: number) => void}) {

	const [date, setDate] = React.useState<moment.Moment>(TimeService.getCorrectMoment());
	// this.printDailyReport(TimeService.getCorrectMoment().startOf('d').unix(), TimeService.getCorrectMoment().endOf('d').unix());

	return (
		<React.Fragment>
				<FieldsFactory.DateField
					label={"Data stampa"}
					value={date.toDate()}
					onChange={(dateToSet: moment.Moment | null) => setDate(dateToSet)}
					pickerVariant={'static'}
				/>
			<DialogActions>
				<Button 
					color='primary' 
					onClick={(e) => props.printFn(date.startOf('d').unix(), date.endOf('d').unix())}
				>
					Stampa data selezionata
				</Button>
			</DialogActions>
		</React.Fragment>
	);
}


function PrintTimeframeMovementDialog(props: {printFn: (start: number, end: number) => void}) {
	
	const [startDate, setStartDate] = React.useState<moment.Moment>(TimeService.getCorrectMoment());
	const [endDate, setEndDate] = React.useState<moment.Moment>(TimeService.getCorrectMoment());
	// this.printDailyReport(TimeService.getCorrectMoment().startOf('d').unix(), TimeService.getCorrectMoment().endOf('d').unix());

	return (
		<React.Fragment>
			<DialogContent>
				<Box m={2}>
					<FieldsFactory.DateField
						label={'Da data'}
						onChange={(date: moment.Moment | null) => setStartDate(date)}
						value={startDate.toDate()}
						showTodayButton={true}
					/>
				</Box>
				<Box m={2}>
					<FieldsFactory.DateField
						label={'Fino a data'}
						onChange={(date: moment.Moment | null) => setEndDate(date)}
						value={endDate.toDate()}
						showTodayButton={true}
					/>
				</Box>
			</DialogContent>
			<DialogActions>
				<Button 
					color='primary' 
					disabled={!startDate || !endDate}
					onClick={(e) => props.printFn(startDate.startOf('d').unix(), endDate.endOf('d').unix())}
				>
					Stampa data selezionata
				</Button>
			</DialogActions>
		</React.Fragment>
	);
}

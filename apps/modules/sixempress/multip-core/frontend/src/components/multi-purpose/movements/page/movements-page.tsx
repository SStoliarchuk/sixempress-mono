import './movements-page.css';
import React from 'react';
import { Movement, SplitReport, MovementDirection, MovementMedium, MovementMediumIcons, MovementGraph } from '../Movement';
import { TimeService, FieldsFactory, ComponentCommunicationService, DataFormatterService, ObjectUtils, RequestService, BusinessLocationsService } from '@sixempress/main-fe-lib';
import { AuthService } from '@sixempress/abac-frontend';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import Paper from '@material-ui/core/Paper';
import Icon from '@material-ui/core/Icon';
import Divider from '@material-ui/core/Divider';
import Refresh from '@material-ui/icons/Refresh';
import Container from '@material-ui/core/Container';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import ArrowUpward from '@material-ui/icons/ArrowUpward';
import ArrowDownward from '@material-ui/icons/ArrowDownward';
import { MovementController } from '../movement.controller';
import { SocketService } from '@sixempress/main-fe-lib';
import { MovementsGraph } from './graph/movements-graph';
import { RecapCards } from 'apps/modules/sixempress/multip-core/frontend/src/utils/recap-cards/recap-cards';
import { MovementsTable } from '../table/movements.table';
import { getModelClassLabel } from '../../../../utils/enums/model-class';


interface MPState {
	movements: Movement[];
	movementsData?: MovementGraph,
	lastRequestMs: number,
	from: number;
	to: number;
	split?: SplitReport,
}

export class MovementsPage extends React.Component<{}, MPState> {

	controller = new MovementController();

	generateSplitreport = true;

	constructor(p) {
		super(p);
		const data: {time: any} = ComponentCommunicationService.getData('movement-report-page');
		this.state = {
			movements: [],
			lastRequestMs: 0,
			// from: data ? data.time.from : env.envName === 'local' ? TimeService.getCorrectMoment().subtract(1, 'M').startOf('M').unix() : TimeService.getCorrectMoment().startOf('d').unix(),
			// to: data ? data.time.to : env.envName === 'local' ? TimeService.getCorrectMoment().subtract(1, 'M').endOf('M').unix() : TimeService.getCorrectMoment().endOf('d').unix(),
			from: data ? data.time.from : TimeService.getCorrectMoment().startOf('d').unix(),
			to: data ? data.time.to : TimeService.getCorrectMoment().endOf('d').unix(),
		};
	}


	// request the movements at the start
	componentDidMount() { 
		this.updateTimeframe(this.state.from, this.state.to, true); 
	}

	protected getFilterByStatus(from: number, to: number) {
		const filter: any = { 
			date: { $gte: from,  $lte: to }, 
		};

		return filter;
	}

	/**
	 * Updates the array of movements by requesting them from the BE
	 */
	private updateTimeframe = async (from: number, to: number, skipTimeout?: boolean) => {
		const res = await Promise.all([
			this.controller.getMovementGraph(this.getFilterByStatus(from, to)),
			this.generateSplitreport ? this.controller.getMovementSplit(from, to) : null,
		]);
		const graph = res[0];
		const split = res[1];
		
		this.setState({movementsData: graph});

		if (split && Object.keys(split).length) {
			// order keys
			const unordered: SplitReport = {};
			// replace labels
			const labels = getModelClassLabel()
			for (const k in split) {
				const l = k === 'additional' ? 'Movimenti Manuali' : labels[k] || k;
				unordered[l] = split[k];
			}
			
			const d: SplitReport = {};
			const keys = Object.keys(unordered).sort().reverse();
			for (const k of keys)
				d[k] = unordered[k];

			this.setState({split: d});
		}

		if (skipTimeout) {
			this.setState({lastRequestMs: new Date().getTime(), from, to, movementsData: graph});
		}
		// just for better ux
		else {
			setTimeout(() => {
				this.setState({lastRequestMs: new Date().getTime(), from, to, movementsData: graph});
			}, 150);
		}
	}

	/**
	 * Takes an id of a movements and takes its status from the backend
	 * then updates the current state
	 * 
	 * used to update movements withouth rebuilding the whole page
	 */
	private updateMovementId = (ids: string | string[], socketRequest?: boolean) => {
		if (SocketService.isActive && !socketRequest) { return false; }

		const idArr = typeof ids === 'string' ? [ids] : ids;
		// check if the date is oc
		this.controller.getMulti({params: {filter: {_id: {$in: idArr}}}}).then(movs => {
			this.setState(s => {
				
				const movsHm = ObjectUtils.arrayToHashmap(movs.data, '_id');
				const newMovs = [...s.movements];

				for (const id of idArr) {

					const mov = movsHm[id];
					const idx = newMovs.findIndex(m => m._id === id);
					
					// remove
					if (
						// is deleted
						(!mov || mov._deleted) ||
						// or out of range
						(mov.date > this.state.to || mov.date < this.state.from)
					) {
						// only if present remove
						if (idx !== -1) { 
							newMovs.splice(idx, 1); 
						}
					}
					// if not present in array
					// then add it
					else if (idx === -1) {
						newMovs.push(mov);
					}
					// else if present then update
					else {
						newMovs.splice(idx, 1, mov);
					}

				}

				return this.getMovDataState(newMovs);
			});
		});
	}

	private getMovDataState(movs: Movement[]): {} {
		return {
			// movements: movs.sort((a, b) => b.date - a.date),
			// lastRequestMs: new Date().getTime(),
		}
	}

	private handleUpdateTable = (e?: any) => {
		this.updateTimeframe(this.state.from, this.state.to);
	}


	render() {

		const startInterval = DataFormatterService.formatUnixDate(this.state.from, 'DD/MM/YYYY');
		const endInterval = DataFormatterService.formatUnixDate(this.state.to, 'DD/MM/YYYY');

		// const movRows = movs.filter(m => m.direction !== MovementDirection.none);
		const showDetailedDate = this.state.movements.length !== 0 && startInterval !== endInterval;

		return (
			<Container id='movements-page-container' component='div' maxWidth='lg' disableGutters={true}>
				
				{this.getDateSetter()}
				
				{/* {showDetailedDate && (
					<MovementsGraph 
						movements={this.state.movements} 
						from={this.state.from} 
						to={this.state.to} 
						onGraphClick={this.updateTimeframe}
					/>
				)} */}
				{this.getCardsSum()}

				{Boolean(this.state.lastRequestMs) && this.getTable()}
				
			</Container>
		);
	}


	private getDateSetter() {

		return (
			<Paper className='def-box movements-page-controls'>

				{/* TODO add the total of earned/loss */}
				{/* TODO add the movements graph :D */}

				<div>
					<div className='mpc-refresh'>
						<div>
							<IconButton size='small'onClick={this.handleUpdateTable}>
								<Refresh/>
							</IconButton>
						</div>
					</div>
					{AuthService.isAttributePresent(Attribute.viewAllTimeMovements) && (
						<div className='mpc-from-to-picker'>
							<FieldsFactory.DateField
								value={this.state.from}
								pickerType={"simple_date"}
								margin={'dense'}
								variant={'outlined'}
								fullWidth={false}
								label={'Da data'}
								onChange={(m) => this.updateTimeframe(m.startOf('d').unix(), this.state.to)}
							/>
							<FieldsFactory.DateField
								value={this.state.to}
								pickerType={"simple_date"}
								margin={'dense'}
								variant={'outlined'}
								fullWidth={false}
								label={'A data'}
								onChange={(m) => this.updateTimeframe(this.state.from, m.endOf('d').unix())}
							/>
						</div>
					)}
				</div>
			</Paper>
		)
	}


	// TODO move this away from render()
	// and into state directly lol
	private getCardsSum() {
		if (!this.state.movementsData)
			return;

		const { cashIn, cashOut, internalIn, internalOut, posIn, posOut } = this.state.movementsData;

		const totIn = cashIn + posIn;
		const totOut = cashOut + posOut;
		const atLeastOnePos = posIn > 0 || posOut > 0;

		return (
			<RecapCards>
				<div className='recap-card'>
					Entrate / Uscite<br/>
					<table>
						<tbody>
							{(cashIn > 0 || cashOut > 0) && (
								<tr>
									<td>
										<ArrowUpward color='primary'/>
									</td>
									<td>
										<Typography variant='h6' color='primary'>
											€ {DataFormatterService.centsToBigNumber(cashIn)}
										</Typography>
									</td>
									<td>
										<Icon color='primary'>{MovementMediumIcons[MovementMedium.cash]}</Icon>
									</td>

									<td>
										<ArrowDownward color='secondary'/>
									</td>
									<td>
										<Typography variant='h6' color='secondary'>
											€ {DataFormatterService.centsToBigNumber(cashOut)}
										</Typography>
									</td>
									<td>
										<Icon color='secondary'>{MovementMediumIcons[MovementMedium.cash]}</Icon>
									</td>
								</tr>
							)}
							{(posIn > 0 || posOut > 0) && (
								<tr>
									<td>
										<ArrowUpward color='primary'/>
									</td>
									<td>
										<Typography variant='h6' color='primary'>
											€ {DataFormatterService.centsToBigNumber(posIn)}
										</Typography>
									</td>
									<td>
										<Icon color='primary'>{MovementMediumIcons[MovementMedium.card]}</Icon>
									</td>

									<td>
										<ArrowDownward color='secondary'/>
									</td>
									<td>
										<Typography variant='h6' color='secondary'>
											€ {DataFormatterService.centsToBigNumber(posOut)}
										</Typography>
									</td>
									<td>
										<Icon color='secondary'>{MovementMediumIcons[MovementMedium.card]}</Icon>
									</td>
								</tr>
							)}
							{(cashIn > 0 || cashOut > 0) && (posIn > 0 || posOut > 0) && (
								<>
									<tr>
										<td colSpan={6}>
											<Divider/>
										</td>
									</tr>

									<tr>
										<td>
											Tot:
										</td>
										<td>
											<Typography variant='h6' color='primary'>
												€ {DataFormatterService.centsToBigNumber(totIn)}
											</Typography>
										</td>
										<td>
										</td>

										<td>
											Tot:
										</td>
										<td>
											<Typography variant='h6' color='secondary'>
												€ {DataFormatterService.centsToBigNumber(totOut)}
											</Typography>
										</td>
										<td>
										</td>
									</tr>
								</>
							)}
							{(posIn > 0 || posOut > 0)}
						</tbody>
					</table>
					<Divider className='def-mui-divider'/>
					<table>
						<tbody>
							{atLeastOnePos && (
								<tr>
									<td>Senza POS:</td>
									<td>
										<Typography color={cashIn > cashOut ? 'primary' : 'error'}>
											€ {DataFormatterService.centsToBigNumber(cashIn - cashOut)}
										</Typography>
									</td>
								</tr>
							)}
							<tr>
								<td>Somma:</td>
								<td>
									<Typography color={totIn > totOut ? 'primary' : 'error'}>
										€ {DataFormatterService.centsToBigNumber(totIn - totOut)}
									</Typography>
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				{(internalIn !== 0 || internalOut !== 0) && (
					<div className='recap-card'>
						Entrate / Uscite (Interne)<br/>
						<div>
						<ArrowUpward color='primary'/>
							<Typography variant='h6' color='primary'>
								€ {DataFormatterService.centsToBigNumber(internalIn)}
							</Typography>
						</div>
						<div>
							<ArrowDownward color='error'/>
							<Typography variant='h6' color='error'>
								€ {DataFormatterService.centsToBigNumber(internalOut)}
							</Typography>
						</div>
						Somma Esterne ed Interne
						<div>
							<Typography variant='h6' color={internalIn + totIn > internalOut + totOut ? 'primary' : 'error'}>
								€ {DataFormatterService.centsToBigNumber((internalIn - internalOut) + (totIn - posIn) - (totOut - posOut))}
							</Typography>
						</div>
						{(posIn !== 0 || posOut !== 0) && (
							<>
								Somma Esterne, Interne e POS
								<div>
									<Typography variant='h6' color={internalIn + totIn + posIn > internalOut + totOut + posOut ? 'primary' : 'error'}>
										€ {DataFormatterService.centsToBigNumber((internalIn - internalOut) + (totIn - totOut) )}
									</Typography>
								</div>
							</>
						)}
					</div>
				)}

				{this.state.split && this.splitReport()}

			</RecapCards>
		)
	}

	protected splitReport() {
		return (
			<div className='recap-card'>
				<table>
					<thead>
						<tr>
							<td></td>
							<td>Entrata</td>
							<td>Uscita</td>
						</tr>
					</thead>
					<tbody>
						{Object.keys(this.state.split).map(k => (
							<tr key={k}>
								<td>{k}</td>
								<td>
									<Typography color='primary'>
										&nbsp;€&nbsp;{this.state.split[k][1] === 0 ? 0 : DataFormatterService.centsToBigNumber(this.state.split[k][1])}
									</Typography>
								</td>
								<td>
									<Typography color='secondary'>
										&nbsp;€&nbsp;{this.state.split[k][0] === 0 ? 0 : DataFormatterService.centsToBigNumber(this.state.split[k][0])}
									</Typography>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	}

	protected getTable = (): JSX.Element => {
		return <MovementsTable 
			key={'' + this.state.lastRequestMs}
			emeddedData={undefined} 
			isEmbedded={undefined} 
			embedReportTemp
			defaultFilters={this.getFilterByStatus(this.state.from, this.state.to)}
		/>;
	}

}

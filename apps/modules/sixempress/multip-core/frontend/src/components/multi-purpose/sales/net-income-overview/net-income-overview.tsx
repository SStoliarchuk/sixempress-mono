import React from 'react';
import Paper from '@material-ui/core/Paper';
import Container from '@material-ui/core/Container';
import Box from '@material-ui/core/Box';
import IconButton from '@material-ui/core/IconButton';
import Refresh from '@material-ui/icons/Refresh';
import Typography from '@material-ui/core/Typography';
import Divider from '@material-ui/core/Divider';
import { DataFormatterService, FieldsFactory, IUserFilter, LoadingOverlay,  SelectFieldValue,  TimeService,} from '@sixempress/main-fe-lib';
import { Sale } from '../Sale';
import { RecapCards } from 'apps/modules/sixempress/multip-core/frontend/src/utils/recap-cards/recap-cards';
import { SaleAnalysisController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/sale-analyses/SaleAnalysis.controller';
import { getFilterModelClassList, SaleAnalysis, SaleAnalysisGraph, SaleAnalysisStatus } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/sale-analyses/SaleAnalysis';
import { SaleAnalysisTable } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/sale-analyses/SaleAnalysis.table';
import { ModelClass, getModelClassLabel } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { FormHelperText } from '@material-ui/core';

export interface NIOState {
	/**
	 * Used as key for the sales table
	 * its the ms since last updated sales array
	 */
	lastRequestMs: number,
	from: number;
	to: number;
	filterModelClasses: ModelClass[],
	totals?: SaleAnalysisGraph,
}

export class NetIncomeOverview extends React.Component<{}, NIOState> {


	constructor(p) {
		super(p);
		// const data: {time: any} = ComponentCommunicationService.getData('movement-report-page');
		this.state = {
			lastRequestMs: 0,
			filterModelClasses: [],
			// categories: [],

			// from: TimeService.getCorrectMoment().subtract(1, 'y').startOf('d').unix(),
			from: TimeService.getCorrectMoment().startOf('d').unix(),
			to: TimeService.getCorrectMoment().endOf('d').unix(),
			// from: data ? data.time.from : TimeService.getCorrectMoment().startOf('d').unix(),
			// to: data ? data.time.to : TimeService.getCorrectMoment().endOf('d').unix(),
		};
	}

	private availableClasses: SelectFieldValue[] = getFilterModelClassList().map(v => ({value: v, label: getModelClassLabel()[v]}));

	// request the movements at the start
	componentDidMount() { 
		this.updateTimeframe(this.state.from, this.state.to, true); 
		//on(SocketCodes.dbObjectChange, this.updateBySocket);
	}
	
	// componentWillUnmount() {
	// 	SocketService.off(SocketCodes.dbObjectChange, this.updateBySocket);
	// }
	
	// private updateBySocket = (data: => {
	// 	if (data.m ===Sale) {
	// 		// TODO implement better logic
	// 		this.updateTimeframe(this.state.from, this.state.to, true);
	// 	}
	// }

	private getFilterByStatus(from: number, to: number) {
		const filter: IUserFilter = { 
			endDate: { $gte: from,  $lte: to }, 
			status: {$in: [SaleAnalysisStatus.success, SaleAnalysisStatus.successPrePay]} 
		};
		if (this.state.filterModelClasses.length)
			filter['_generatedFrom.modelClass'] = {$in: this.state.filterModelClasses};

		return filter;
	}

	protected updateTimeframe = async (from: number, to: number, skipTimeout?: boolean) => {
		// no available model classes
		if (!this.availableClasses.length)
			return;


		LoadingOverlay.loading = true;
		const graph = await new SaleAnalysisController().getGraph(this.getFilterByStatus(from, to));

		if (skipTimeout) {
			LoadingOverlay.loading = false;
			this.setState({totals: graph, from, to, lastRequestMs: new Date().getTime()});
		}
		// just for better ux
		else {
			setTimeout(() => {
				LoadingOverlay.loading = false;
				this.setState({totals: graph, from, to, lastRequestMs: new Date().getTime()});
			}, 150);
		}

	}

	private onClickRefresh = () => {
		this.updateTimeframe(this.state.from, this.state.to);
	}

	render() {
		return (
			<Container component='div' maxWidth='lg' disableGutters={true}>
				<Paper className='def-box'>
					<Box display='flex' mt={1.5}>
						<Box mt={1.5} mr={2}>
							<IconButton size='small'onClick={this.onClickRefresh}>
								<Refresh/>
							</IconButton>
						</Box>
						<Box display='flex' flexWrap='wrap'>
							<Box display='flex' position='relative'>
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
								<Box position='absolute' left={0} top={-25}>
									<FormHelperText>Data Termine pagamenti compresa Da - A</FormHelperText>
								</Box>
							</Box>
							{this.availableClasses.length !== 0 && (
								<FieldsFactory.MultiSelectField
									values={this.availableClasses}
									label={'Categoria'}
									margin={'dense'}
									variant='outlined'
									value={this.state.filterModelClasses}
									onChange={(e) => {
										const val = e.target.value;
										this.setState({filterModelClasses: val as any})
									}}
									onClose={() => this.updateTimeframe(this.state.from, this.state.to)}
								/>
							)}
						</Box>
					</Box>
				</Paper>

				{this.state.totals && (
					<>
						<RecapCards>
							<div>
								Entrate totali
								<div>
									<Typography variant='h6' color='primary'>
										€ {DataFormatterService.centsToBigNumber(this.state.totals.sum)}
									</Typography>
								</div>
								<Divider className='def-mui-divider'/>
								Somma Netto
								<div>
									<Typography variant='h6' color={this.state.totals.netNegative + this.state.totals.netPositive > 1 ? 'primary' : 'error'}>
										€ {DataFormatterService.centsToBigNumber(this.state.totals.netNegative + this.state.totals.netPositive)}
									</Typography>
								</div>
							</div>

							<div>
								Vendite con Netto Positivo
								<div>
									<Typography variant='h6' color='primary'>
										€ {DataFormatterService.centsToBigNumber(this.state.totals.netPositive)}
									</Typography>
								</div>
								<Divider className='def-mui-divider'/>
								Vendite con Netto Negativo
								<div>
									<Typography variant='h6' color='primary'>
										€ {DataFormatterService.centsToBigNumber(this.state.totals.netNegative)}
									</Typography>
								</div>
							</div>

							{(this.state.totals.priceIncrease !== 0 || this.state.totals.priceReductions !== 0) && (
								<div>
									{this.state.totals.priceReductions !== 0 && (
										<>
											Somma sconti eseguiti
											<div>
												<Typography variant='h6' color='primary'>
													€ {DataFormatterService.centsToBigNumber(this.state.totals.priceReductions)}
												</Typography>
											</div>
										</>
									)}
									{this.state.totals.priceIncrease !== 0 && (
										<>
											Somma incrementi prezzo
											<div>
												<Typography variant='h6' color='primary'>
													€ {DataFormatterService.centsToBigNumber(this.state.totals.priceIncrease)}
												</Typography>
											</div>
										</>
									)}
								</div>
							)}
						</RecapCards>
					</>
				)}

				{this.getTable()}
				
			</Container>
		);
	}

	protected getTable = (): JSX.Element => {
		return <SaleAnalysisTable 
			key={'' + this.state.lastRequestMs}
			emeddedData={undefined} 
			isEmbedded={undefined} 
			embedReportTemp 
			defaultFilters={this.getFilterByStatus(this.state.from, this.state.to)}
		/>;
	}


}
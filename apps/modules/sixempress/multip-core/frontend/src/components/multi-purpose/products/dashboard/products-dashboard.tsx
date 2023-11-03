import React from 'react';
import Paper from '@material-ui/core/Paper';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import IconButton from '@material-ui/core/IconButton';
import Refresh from '@material-ui/icons/Refresh';
import { SmallUtils, DataFormatterService, ComponentCommunicationService, TimeService, FieldsFactory, ModalService, RequestService, RouterService, RouteComponentProps } from '@sixempress/main-fe-lib';
import { TopSoldReport, PDState, TopSoldReportDetails, ProductDataReport } from './dtd';
import { Doughnut } from 'react-chartjs-2';
import Skeleton from '@material-ui/lab/Skeleton';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import { ProductsSold } from './products-sold';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';

export class ProductsDashboard extends React.Component<RouteComponentProps & {children?: any}, PDState> {

	public static async getProductsData(from: number | Date, to: number | Date): Promise<ProductDataReport & {topSold: TopSoldReport}> {
		const base = (await RequestService.client('get', BePaths.productsdatareport)).data;
		const sold = await ProductsDashboard.getTopSold(from, to);
		
		return {...base, topSold: sold};
	}

	public static async getTopSold<A extends boolean>(from: number | Date, to: number | Date, detailed?: A): Promise<A extends true ? TopSoldReportDetails : TopSoldReport> {
		return (await RequestService.client('get', BePaths.productsdatareport + (detailed ? 'topsold/details' : 'topsold'), {
			disableLoading: detailed ? true : false,
			params: {
				topSoldFrom: typeof from === 'number' ? from : Math.floor(from.getTime() / 1000),
				topSoldTo: typeof to === 'number' ? to : Math.floor(to.getTime() / 1000),
			},
		})).data;
	}

	state: PDState = {
		topSoldProductsChart: {
			chartdata: {
				datasets: [{ 
					data: [1, 1, 1],
					backgroundColor: SmallUtils.getColor(),
				}],
			},
			chartoptions: { 
				maintainAspectRatio: false,
				legend: { display: false }
			},
		},
		
		chartKey: '',
		from: TimeService.getCorrectMoment().startOf('d').unix(),
		to: TimeService.getCorrectMoment().endOf('d').unix(),
		canRender: false,
	};

	componentDidMount() {
		// setTimeout(this.onClickOpenProductDetails, 200);
		ProductsDashboard.getProductsData(this.state.from, this.state.to).then(r => {
			this.updateStateByTopSold(r.topSold);
			this.setState({canRender: true, beData: r });
		});
	}

	private updateStateByTopSold(r: TopSoldReport) {
		this.setState(s => {
			r.items.sort((a, b) => b.amount - a.amount);

			if (r.items.length !== 0) {
				const labels = [];
				const dataset = [];
				for (const p of r.items) {
					labels.push(p.name);
					dataset.push(p.amount);
				}
				s.topSoldProductsChart.chartdata.datasets[0].data = dataset;
				s.topSoldProductsChart.chartdata.labels = labels;
			}
			
			return {...s, chartKey: Math.random().toString()};
		});
	}

	private updateTimeFrame(from: number, to: number) {
		this.setState({from, to});
		ProductsDashboard.getTopSold(from, to, false).then((r: TopSoldReport) => this.updateStateByTopSold(r));
	}


	private showNegativeAmountDtHandler = (e?: any) => {
		ComponentCommunicationService.setData('products-table', true);
		RouterService.goto('/products/table');
	}

	private showAtZeroHandler = (e?: any) => {
		RouterService.goto('/products/table');
	}

	private onClickOpenProductDetails = () => {
		ModalService.open(ProductsSold, {to: this.state.to, from: this.state.from}, {maxWidth: 'md', fullWidth: true});
	}

	render() {

		if (!this.state.canRender) {
			return (null);
		}

		return (
			<Container component='div' maxWidth='lg' disableGutters={true}>

				{this.state.beData && (
					<Box mb={2}>
						<Grid container spacing={2}>
							
							<Grid item lg={6} xs={12}>
								<Paper>
									<Box p={2}>
										<h2 style={{margin: 0}}>Dati Riepilogativi</h2>
										<Box display='flex' flexWrap='wrap'>
											<Box mr={5} p={1}>
												Quantita' prodotti totali: <span className='text-primary'>{this.state.beData.allProductAmount}<br/></span>
												<br/>
												Potenziale Lordo: <span className='text-primary'>€ {DataFormatterService.centsToBigNumber(this.state.beData.pricestotal.sell)}<br/></span>
												Potenziale Netto: <span className='text-primary'>€ {DataFormatterService.centsToBigNumber(this.state.beData.pricestotal.sell - this.state.beData.pricestotal.buy)}<br/></span>
												Investito (Merce): <span className='text-primary'>€ {DataFormatterService.centsToBigNumber(this.state.beData.pricestotal.buy)}<br/></span>
											</Box>
											{this.state.beData.negativeAmountProducts && (
												<div>
													<Box className='bg-error mouse-link' display='inline-block' p={1} borderRadius='5px' onClick={this.showNegativeAmountDtHandler}>
														Sono presenti prodotti con giacenza inferiore a 0<br/>
													</Box>
												</div>
											)}
											{this.state.beData.sellingAtZero && (
												<div>
													<Box className='bg-secondary mouse-link' display='inline-block' p={1} borderRadius='5px' onClick={this.showAtZeroHandler}>
														Sono presenti prodotto con prezzo uguale o inferiore a 0<br/>
													</Box>
												</div>
											)}
										</Box>
									</Box>
								</Paper>
							</Grid>
						</Grid>
					</Box>
				)}

				<Paper>
					<Box p={2} pb={3}>
						<Typography variant='h5'>
							Prodotti piu' venduti
						</Typography>

						<Box display='flex' my={1}>
							<Box mt={1.5} mr={2}>
								<IconButton size='small'onClick={() => this.updateTimeFrame(this.state.from, this.state.to)}>
									<Refresh/>
								</IconButton>
							</Box>
							<FieldsFactory.DateField
								value={this.state.from}
								pickerType={"simple_date"}
								margin={'dense'}
								variant={'outlined'}
								fullWidth={false}
								label={'Da data'}
								onChange={(m) => this.updateTimeFrame(m.startOf('d').unix(), this.state.to)}
							/>
							<FieldsFactory.DateField
								value={this.state.to}
								pickerType={"simple_date"}
								margin={'dense'}
								variant={'outlined'}
								fullWidth={false}
								label={'A data'}
								onChange={(m) => this.updateTimeFrame(this.state.from, m.endOf('d').unix())}
							/>
						</Box>

						<Box display='flex' justifyContent='center' alignItems='center' flexWrap='wrap'>
							<Box maxWidth='400px' maxHeight='300px' mt={2}>
								{ !this.state.topSoldProductsChart.chartdata.labels?.length && (
									<Box 
										style={{
											backgroundColor: 'rgba(0, 0, 0, 0.1)', 
											borderRadius: '10px',
											textAlign: 'center',
											position: 'absolute',
											marginLeft: '-10px',
											marginTop: '-10px',
											width: '320px',
											height: '320px',
											display: 'flex',
											flexDirection: 'column',
											justifyContent: 'center',
											color: 'white',
											filter: 'drop-shadow(0 0 2px black)',
										}} 
									>
										<h2>Non ci sono dati</h2>
									</Box>
								)}
								<Doughnut
									key={this.state.chartKey /* + UiSettings.colorsTheme */}
									data={this.state.topSoldProductsChart.chartdata}
									width={300}
									height={300}
									options={this.state.topSoldProductsChart.chartoptions}
								/>
							</Box>
							<Box mt={2} ml={2}>
								{this.state.topSoldProductsChart.chartdata.labels?.length 
									? <>
										{(this.state.topSoldProductsChart.chartdata.labels as string[]).map((l, idx) => (
											<Box key={l + idx}>
												{this.state.topSoldProductsChart.chartdata.datasets[0].data[idx] as number} {l}
											</Box>
										))}
										<Button color='primary' onClick={this.onClickOpenProductDetails}>Info Dettagliate</Button>
										</>
									: (
										<>
											<Skeleton animation={false} width='150px' />
											<Skeleton animation={false} width='120px' />
											<Skeleton animation={false} width='160px' />
											<Skeleton animation={false} width='90px' />
											<Skeleton animation={false} width='200px' />
											<Skeleton animation={false} width='150px' />
											<Skeleton animation={false} width='120px' />
											<Skeleton animation={false} width='160px' />
											<Skeleton animation={false} width='90px' />
											<Skeleton animation={false} width='200px' />
										</>
									)
								}
							</Box>
						</Box>

					</Box>
				</Paper>
			</Container>
		);
	}
	

}

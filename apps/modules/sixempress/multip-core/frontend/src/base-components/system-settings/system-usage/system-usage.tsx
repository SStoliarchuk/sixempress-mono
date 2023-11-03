import './system-usage.css';
import React from 'react';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import { SUState, RequestsSizeTrace } from './dtd';
import Typography from '@material-ui/core/Typography';
import ArrowUpward from '@material-ui/icons/ArrowUpward';
import ArrowDownward from '@material-ui/icons/ArrowDownward';
import Tooltip from '@material-ui/core/Tooltip';
import Container from '@material-ui/core/Container';
import { BePaths, RequestService } from '@sixempress/main-fe-lib';

export class SystemUsage extends React.Component<{}, SUState> {

	componentDidMount() {
		RequestService.client<{kbSize: number, monthlyUsage: RequestsSizeTrace}>('get', BePaths.systemusagestate)
		.then(res => {

			const r = res.data;
			let kbIn = 0, kbOut = 0;
			let usageGraph: this['state']['monthlyUsage']['usageGraph'];

			if (r.monthlyUsage) {
				
				// initalize data
				const currDay = new Date().getDate().toString();
				usageGraph = { days: [], singleDay: {}, singleDayDate: currDay };

				// sum kbs
				for (const day in r.monthlyUsage.requests) {
					
					let dayIn = 0, dayOut = 0;
					
					for (const hour in r.monthlyUsage.requests[day]) {
						
						let hourWrite = 0;
						let hourRead = 0;
						for (const uid in r.monthlyUsage.requests[day][hour]) {
							hourWrite += r.monthlyUsage.requests[day][hour][uid].w;
							hourRead += r.monthlyUsage.requests[day][hour][uid].r;
						}

						if (day === currDay) {
							usageGraph.singleDay[hour] = hourWrite + hourRead;
						}

						dayIn += hourWrite;
						dayOut += hourRead;
					}
					
					usageGraph.days.push({day: parseInt(day), kb: dayIn + dayOut});
					kbIn += dayIn;
					kbOut += dayOut;
				}

				usageGraph.days.sort((a, b) => a.day - b.day);
			}



			const newState: this['state'] = {
				kbSize: r.kbSize,
				monthlyUsage: { 
					sentFromServer: kbIn, 
					writtenToServer: kbOut, 
					data: r.monthlyUsage, 
					usageGraph,
				}
			};
			

			this.setState(newState);
		});
	}

	private changeDayDataHandler = (e: React.MouseEvent<any>) => {
		this.changeDayData(e.currentTarget.dataset.chartDay);
	}

	private changeDayData(day: string) {
		const todayData: {[hour: string]: number} = { };
		const data = this.state.monthlyUsage.data;
		
		for (const hour in data.requests[day]) {
			todayData[hour] = 0;
			for (const uid in data.requests[day][hour]) {
				todayData[hour] += data.requests[day][hour][uid].w + data.requests[day][hour][uid].r;
			}
		}

		this.setState({monthlyUsage: {...this.state.monthlyUsage, usageGraph: {...this.state.monthlyUsage.usageGraph, singleDay: todayData, singleDayDate: day}}});
	}


	private formatSize(sizeInKb: number): string {
		if (sizeInKb < 1000) {
			return sizeInKb + ' KB';
		}
		else if (sizeInKb < 1000000) {
			return (sizeInKb / 1000).toFixed(2) + ' MB';
		}
		else {
			return (sizeInKb / 1000000).toFixed(2) + ' GB';
		}
	}

	render() {
		if (!this.state) {
			return (null);
		}

		const maxBarHeight = 250;
		const highestGraphReq = this.state.monthlyUsage.usageGraph && this.state.monthlyUsage.usageGraph.days.reduce((car, cur) => {
			if (cur.kb > car) { car = cur.kb; }
			return car;
		}, 0);
		const todayHighestGraph = this.state.monthlyUsage.usageGraph && Object.values(this.state.monthlyUsage.usageGraph.singleDay).reduce((car, cur) => {
			if (cur > car) { car = cur; }
			return car;
		}, 0);

		const currMonth = new Date().getMonth().toString().padStart(2, '0');

		return (
			<Container component="div" maxWidth="lg" disableGutters={true}>
				<Box mb={2}>
					<Grid container spacing={2}>
						
						<Grid item lg={6} xs={12}>
							<Paper>
								<Box p={2}>
									<h2 style={{margin: 0}}>Dati Sistema</h2>
									<Box display='flex'>
										{/* <Box mr={5}>
											Codice login: {buss.loginSlug}<br/>
										</Box> */}
									</Box>
								</Box>
							</Paper>
						</Grid>

						<Grid item lg={3} sm={6} xs={12}>
							<Paper style={{height: '100%'}}>
								<Box display='flex' p={2} justifyContent='center' alignItems='center' height="100%">
									<Box width="100%" textAlign="center">

										Dati trasmessi questo mese
										<Box display='flex' justifyContent='space-around' width="100%">
											<Tooltip title='Dati Ricevuti'>
												<Box display='flex' alignItems='center'>
													<ArrowDownward color='primary'/>
													<Typography variant='h6' color='primary'>
														{this.formatSize(this.state.monthlyUsage.sentFromServer)}
													</Typography>
												</Box>
											</Tooltip>
											<Tooltip title='Dati Inviati'>
												<Box display='flex' alignItems='center'>
													<ArrowUpward color='primary'/>
													<Typography variant='h6' color='primary'>
														{this.formatSize(this.state.monthlyUsage.writtenToServer)}
													</Typography>
												</Box>
											</Tooltip>
										</Box>
										
									</Box>
								</Box>
							</Paper>
						</Grid>

						<Grid item lg={3} sm={6} xs={12}>
							<Paper style={{height: '100%'}}>
								<Box textAlign='center' display='flex' p={2} justifyContent='center' alignItems='center' height="100%">
									<Box>

										Spazio su Hard Disk<br/>
										<Typography variant='h5' color='primary'>
											{this.formatSize(this.state.kbSize)}
										</Typography>

									</Box>
								</Box>
							</Paper>
						</Grid>

					</Grid>
				</Box>

				{this.state.monthlyUsage.usageGraph && (
					<Grid container spacing={2}>

						<Grid item lg={6} xs={12}>
							<Paper style={{height: '100%'}}>
								<Box p={2}>

									<Box display='flex' mb={2}>
										Richieste di questo mese
										<Box flexGrow={1} textAlign='right'>
											Totale: {this.formatSize(this.state.monthlyUsage.usageGraph.days.reduce((car, cur) => car += cur.kb, 0))}
										</Box>
									</Box>
									<Box display='flex' borderTop='1px solid rgba(0,0,0,0.2)' borderBottom='1px solid rgba(0,0,0,0.2)'>
										<Box display='flex' flexDirection='column' justifyContent='space-between' mr={1}>
											<div>{this.formatSize(highestGraphReq)}</div>
											<div>{this.formatSize(0)}</div>
										</Box>
										<Box display='flex' alignItems='baseline' flexGrow={1}>
											{this.state.monthlyUsage.usageGraph.days.map(d => (
												<Tooltip key={d.day} title={d.day + '/' + currMonth + " " + this.formatSize(d.kb)}>
													<Box data-chart-day={d.day} onClick={this.changeDayDataHandler} className='chart-bar mouse-link' height={(d.kb * 100 / highestGraphReq) * maxBarHeight / 100 + 'px'}/>
												</Tooltip>
											))}
										</Box>
									</Box>

								</Box>
							</Paper>
						</Grid>

						<Grid item lg={6} xs={12}>
							<Paper>
								<Box p={2}>
									<Box display='flex' mb={2}>
										Richieste del {this.state.monthlyUsage.usageGraph.singleDayDate + "/" + currMonth}
										<Box flexGrow={1} textAlign='right'>
											Totale: {this.formatSize(Object.values(this.state.monthlyUsage.usageGraph.singleDay).reduce((car, cur) => car += cur, 0))}
										</Box>
									</Box>
									
									{Object.values(this.state.monthlyUsage.usageGraph.singleDay).reduce((car, cur) => car += cur, 0) !== 0 && (
										<Box display='flex' borderTop='1px solid rgba(0,0,0,0.2)' borderBottom='1px solid rgba(0,0,0,0.2)'>
											<Box display='flex' flexDirection='column' justifyContent='space-between' mr={1}>
												<div>{this.formatSize(todayHighestGraph)}</div>
												<div>{this.formatSize(0)}</div>
											</Box>
											<Box display='flex' alignItems='baseline' flexGrow={1}>
												{Object.keys(this.state.monthlyUsage.usageGraph.singleDay).map(h => (
													<Tooltip key={h} title={h + ":00 " + this.formatSize(this.state.monthlyUsage.usageGraph.singleDay[h])}>
														<Box className='chart-bar' height={(this.state.monthlyUsage.usageGraph.singleDay[h] * 100 / todayHighestGraph) * maxBarHeight / 100 + 'px'}/>
													</Tooltip>
												))}
											</Box>
										</Box>
									)}

								</Box>
							</Paper>
						</Grid>

					</Grid>
				)}


			</Container>
		);
	}
	
}

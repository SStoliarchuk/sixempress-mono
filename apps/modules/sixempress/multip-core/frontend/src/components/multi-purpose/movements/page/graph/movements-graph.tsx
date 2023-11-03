import './movements-graph.css';
import React from 'react';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import { Line } from 'react-chartjs-2';
import Grid from '@material-ui/core/Grid';
import { UiSettings, SelectFieldValue, FieldsFactory } from '@sixempress/main-fe-lib';
import { Subscription } from 'rxjs';
import { MovementsGraphLogic } from './movements-graph.logic';


export class MovementsGraph extends MovementsGraphLogic {

	private bigSteps: {
		[stepSize: string]: SelectFieldValue[]
	} = {
		month: [
			{label: "Giorni", value: "day"},
			{label: "Mesi", value: "month"},
		],
		year: [
			{label: "Giorni", value: "day"},
			{label: "Mesi", value: "month"},
			{label: "Anni", value: "year"},
		]
	};

	// for theme change
	componentDidMount() {
		UiSettings.colorsThemeChanges.addListener(this.onThemeChange);
	}
	componentWillUnmount() {
		UiSettings.colorsThemeChanges.removeListener(this.onThemeChange);
	}

	private onThemeChange = () => {
		this.setState(s => {
			const n = {...s};
			MovementsGraph.setLabelsColor(n.chartOpts.opts, {inOut: n.inOutChartData, sum: n.sumChartData});
			return {inOutChartData: n.inOutChartData, sumChartData: n.sumChartData, chartOpts: {...n.chartOpts, opts: n.chartOpts.opts}};
		});
	}

	private changeStepSize = (e: React.ChangeEvent<any>) => {
		const val: any = e.target.value;
		this.setState({stepSet: val});
	}

	render() {

		return (
			<Box className='mov-graph' my={1}>
				{this.state.stepsAvailable !== 'day' && (
					<Paper className='control-top'>
						<Box p={2}>
							<FieldsFactory.SelectField
								values={this.bigSteps[this.state.stepsAvailable]}
								margin='none'
								label="Intervallo"
								value={this.state.stepSet}
								onChange={this.changeStepSize}
								fullWidth
							/>
						</Box>
					</Paper>
				)}
				<Grid className='chart-grid-container' container spacing={1}>
					<Grid item sm={6} xs={12}>
						<Paper className='chart-paper'>
							<Box p={2}>
								<Box className="chart-container" width='100%'>
									<Line
										ref={this.chartRef}
										key={UiSettings.colorsTheme + this.state.chartOpts.opts.scales.yAxes[0].ticks.suggestedMax + 'inOut'}
										data={this.state.inOutChartData}
										options={this.state.chartOpts.opts}
									/>
								</Box>
							</Box>
						</Paper>
					</Grid>
					<Grid item sm={6} xs={12}>
						<Paper className='chart-paper'>
							<Box p={2}>
								<Box className="chart-container" width='100%'>
									<Line
										ref={this.chartRef}
										key={UiSettings.colorsTheme + this.state.chartOpts.opts.scales.yAxes[0].ticks.suggestedMax + 'sum'}
										data={this.state.sumChartData}
										options={this.state.chartOpts.opts}
									/>
								</Box>
							</Box>
						</Paper>
					</Grid>
				</Grid>
			</Box>
		);
	}
}

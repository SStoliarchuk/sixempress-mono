import React from 'react';
import moment from 'moment';
import { ComponentCommunicationService, RouterService, UiSettings } from '@sixempress/main-fe-lib';
import { MovementDirection, Movement } from '../../Movement';
import { ChartUtils } from 'apps/modules/sixempress/multip-core/frontend/src/utils/charts/chart-utils';
import { MGProps, MGState, MovementChartLabels } from './movements-graph.dtd';
import chartjs from 'chart.js';

export class MovementsGraphLogic extends React.PureComponent<MGProps, MGState> {

	state: MGState = {
		stepsAvailable: 'day',
		stepSet: 'day',
		chartOpts: {
			opts: ChartUtils.getLineConfiguration({
				onClick: (e) => this.openMovementByChartElements(e),
			}),
		},
	};

	protected chartRef = React.createRef<any>();

	/**
	 * Updates the graph when the movements props changes
	 */
	public static getDerivedStateFromProps(props: MGProps, state: MGState): Partial<MGState> {
		if (!props.movements.length)
			return {...state, noData: true};

		const info = MovementsGraphLogic.generateMovementsInfo(state, props.movements, props.from, props.to, !state.defaultStepSet ? props.defaultStep : undefined);
		MovementsGraphLogic.setLabelsColor(state.chartOpts.opts, {inOut: info.inOutChartData, sum: info.sumChartData});
		
		return {
			...state,
			...info,
			defaultStepSet: true,
			chartOpts: {
				...state.chartOpts,
				onClick: props.onGraphClick,
			}
		};
	}

	/**
	 * Updates the colors of the graphs
	 */
	protected static setLabelsColor(opts: chartjs.ChartOptions, info: {inOut: chartjs.ChartData, sum: chartjs.ChartData}) {
		ChartUtils.updateGraphColors(
			opts, 
			{dataSet: info.inOut, labelColorHm: {
				[MovementChartLabels.movIn]: UiSettings.contentTheme.palette.primary.main,
				[MovementChartLabels.movOut]: UiSettings.contentTheme.palette.error.main,
			}}
		);
		ChartUtils.updateGraphColors(
			opts, 
			{dataSet: info.sum, labelColorHm: {
				[MovementChartLabels.earn]: UiSettings.contentTheme.palette.primary.main,
				[MovementChartLabels.loss]: UiSettings.contentTheme.palette.error.main,
			}}
		);
	}


	/**
	 * Generate the movements in / out graphs
	 */
	private static generateMovementsInfo(state: MGState, movs: Movement[], from: number, to: number, defaultStep?: MGState['stepsAvailable']): Partial<MGState> {

		const toR: Partial<MGState> = { };

		let lastAvailableStepSize = state.stepsAvailable;
		let stepSize = state.stepSet;

		// this is the biggest earnt/lost amount from the in/out table
		// it is used to generate a max used in the in/out earn/lost table
		// so the graph is not misenterpreted
		let biggestNumber = 0;

		// chart data to fill
		const labelsInOut = [];
		const dataToShowInOut = [
			{data: [], label: MovementChartLabels.movIn},
			{data: [], label: MovementChartLabels.movOut},
		];
		const labelsSum = [];
		const dataToShowSum = [
			{data: [], label: MovementChartLabels.earn},
			{data: [], label: MovementChartLabels.loss},
		];

		// check the steps available 
		const fromMoment = moment(from * 1000).toDate();
		const toMoment = moment(to * 1000).toDate();
		if (toMoment.getFullYear() !== fromMoment.getFullYear()) {
			toR.stepsAvailable = 'year';
			// upgrade stepsize
			if (lastAvailableStepSize === 'day' || lastAvailableStepSize === 'month') { 
				stepSize = 'year';
			}
		} else if (toMoment.getMonth() !== fromMoment.getMonth()) {
			toR.stepsAvailable = 'month';
			// upgrade or downgrade the step size
			if (stepSize === 'year' || lastAvailableStepSize === 'day') { 
				stepSize = 'month';
			}
		} else {
			toR.stepsAvailable = 'day';
			stepSize = 'day';
		}
		
		if (defaultStep)
			stepSize = defaultStep;
		
		toR.stepSet = stepSize;
		const stepSizeMomentLetter: moment.unitOfTime.Base = stepSize === 'day' ? 'd' : stepSize === 'month' ? 'M' : 'y';

		// get ready to loop
		// we take the date of a movements if its day as to not create extra empty fields
		//
		// if the step is not day, then we take the given range as to create empty values for better UI
		const oldestMov = stepSize === 'day' ? movs[0].date < movs[movs.length - 1].date ? movs[0].date : movs[movs.length - 1].date : from;
		const newestMov = stepSize === 'day' ? movs[0].date < movs[movs.length - 1].date ? movs[movs.length - 1].date : movs[0].date : to;
		const diffTodayOldestMov = Math.abs(moment(oldestMov * 1000).diff(moment(newestMov * 1000), stepSizeMomentLetter));
		
		for (let i = diffTodayOldestMov; i !== -1; i--) {
			// get times
			const relativeTimeFrame = moment(newestMov * 1000).startOf(stepSizeMomentLetter).subtract(i, stepSizeMomentLetter);
			const startTime = moment(relativeTimeFrame.unix() * 1000).startOf(stepSizeMomentLetter).unix();
			const endTime = moment(relativeTimeFrame.unix() * 1000).endOf(stepSizeMomentLetter).unix();
			
			// create totals of the timeframe
			let totalMovementsInTimeFrameIN: number = 0;
			let totalMovementsInTimeFrameOUT: number = 0;
			for (let idx = 0; idx < movs.length; idx++) {
				const m = movs[idx];
				if (m.direction === MovementDirection.input && m.date >= startTime && m.date <= endTime)
					totalMovementsInTimeFrameIN += m.priceAmount;
				else if (m.direction === MovementDirection.output && m.date >= startTime && m.date <= endTime)
					totalMovementsInTimeFrameOUT += m.priceAmount;
			}
			
			// skip if movements are 0
			if (
				// or if step size is date
				(stepSize === 'day') &&
				// no totals
				!totalMovementsInTimeFrameIN && !totalMovementsInTimeFrameOUT
			) {
				continue;
			}

			// remove cents
			totalMovementsInTimeFrameIN = totalMovementsInTimeFrameIN ? totalMovementsInTimeFrameIN / 100 : totalMovementsInTimeFrameIN;
			totalMovementsInTimeFrameOUT = totalMovementsInTimeFrameOUT ? totalMovementsInTimeFrameOUT / 100 : totalMovementsInTimeFrameOUT;

			// add the label
			if (stepSize === 'day') {
				labelsInOut.push(relativeTimeFrame.format('DD/MM/YY'));
				labelsSum.push(relativeTimeFrame.format('DD/MM/YY'));
			} else if (stepSize === 'month') {
				labelsInOut.push(relativeTimeFrame.format('MM/YYYY'));
				labelsSum.push(relativeTimeFrame.format('MM/YYYY'));
			} else {
				labelsInOut.push(relativeTimeFrame.format('YYYY'));
				labelsSum.push(relativeTimeFrame.format('YYYY'));
			}


			// add to graph
			dataToShowInOut[0].data.push(totalMovementsInTimeFrameIN);
			dataToShowInOut[1].data.push(totalMovementsInTimeFrameOUT);
			
			if (totalMovementsInTimeFrameIN > biggestNumber) {
				biggestNumber = totalMovementsInTimeFrameIN;
			} 
			if (totalMovementsInTimeFrameOUT > biggestNumber) {
				biggestNumber = totalMovementsInTimeFrameOUT;
			}
		
			const sum = totalMovementsInTimeFrameIN - totalMovementsInTimeFrameOUT;
			if (sum >= 0) {
				dataToShowSum[0].data.push(sum);
				dataToShowSum[1].data.push(0);
			} else {
				dataToShowSum[0].data.push(0);
				dataToShowSum[1].data.push(sum);
			}
		}

		
		toR.maxValue = biggestNumber || 0.5;
		toR.inOutChartData = { labels: labelsInOut, datasets: dataToShowInOut, };
		toR.sumChartData = { labels: labelsSum, datasets: dataToShowSum, };
		return toR;
	}


	/**
	 * opens the movement page when clicked on the chart info
	 */
	private openMovementByChartElements(e: MouseEvent) {

		if (this.props.onGraphClick === false)
			return;

		// only if click is below the label
		if ((e as any).layerY < 35 || !this.chartRef.current) { return; }
		const chartEl = this.chartRef.current.chartInstance.getElementsAtEventForMode(e, 'x-axis', {intersect: false});

		// stop if no chart el given
		if (!chartEl[0]) { return; }
		
		const dataToUse = { time: { from: 0, to: 0 } };

		if (this.state.stepSet === 'year') {
			let [year] = chartEl[0]._chart.config.data.labels[chartEl[0]._index].split('/').map(i => parseInt(i));
			dataToUse.time.from = moment().set({'y': year}).startOf('y').unix();
			dataToUse.time.to = moment().set({'y': year}).endOf('y').unix();
		}
		else if (this.state.stepSet === 'month') {
			let [month, year] = chartEl[0]._chart.config.data.labels[chartEl[0]._index].split('/').map(i => parseInt(i));
			month--;
			dataToUse.time.from = moment().set({'y': year, 'M': month}).startOf('M').unix();
			dataToUse.time.to = moment().set({'y': year, 'M': month}).endOf('M').unix();
		}
		else {
			let [day, month, year] = chartEl[0]._chart.config.data.labels[chartEl[0]._index].split('/').map(i => parseInt(i));
			month--;
			year += 2000;
			dataToUse.time.from = moment().set({'y': year, 'D': day, 'M': month}).startOf('d').unix();
			dataToUse.time.to = moment().set({'y': year, 'D': day, 'M': month}).endOf('d').unix();
		}

		// trigger custom fn instead of default
		if (this.state.chartOpts.onClick) {
			this.state.chartOpts.onClick(dataToUse.time.from, dataToUse.time.to);
			return;
		}

		// set the data for the page
		ComponentCommunicationService.setData('movement-report-page', dataToUse);
		// go to the page
		// setting timeout becuase the html is deleted immediately, but the chart instance is not, so the instance
		// tries to clear the html, but as there is no canvas is crashes
		setTimeout(() => {
			RouterService.goto('/saleanalysis/report');
		}, 1);
	}

}

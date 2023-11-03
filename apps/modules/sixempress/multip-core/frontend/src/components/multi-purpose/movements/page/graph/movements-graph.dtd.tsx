import chartjs from 'chart.js';
import { Movement } from "../../Movement";

export interface MGProps {
	/**
	 * give the movements sorted by their date
	 */
	movements: Movement[];
	from: number;
	to: number;
	onGraphClick?: false | ((from: number, to: number) => void);
	defaultStep?: MGState['stepsAvailable'];
}

export interface MGState {
	noData?: boolean,
	defaultStepSet?: boolean,
	inOutChartData?: chartjs.ChartData;
	sumChartData?: chartjs.ChartData;
	maxValue?: number;

	chartOpts: {
		onClick?: MGProps['onGraphClick'],
		opts: chartjs.ChartOptions,
	};

	stepsAvailable: "day" | "month" | "year";
	stepSet: MGState['stepsAvailable'];
}

export enum MovementChartLabels {
	movIn = 'Entrate',
	movOut = 'Uscite',
	earn = 'Guadagno',
	loss = 'Perdita',
}

import chartjs from 'chart.js';
import { UiSettings, DataFormatterService } from '@sixempress/main-fe-lib';

export enum ChartColors {
	lightThemeFont = 'black',
	darkThemeFont = 'rgb(255, 255, 255)',

	lightThemeScales = 'rgb(200, 200, 200)',
	darkThemeScales = 'rgb(100, 100, 100)',
}

export class ChartUtils {

	static getLineConfiguration(p: chartjs.ChartOptions): chartjs.ChartOptions {

		const font = UiSettings.colorsTheme === 'dark' ? ChartColors.darkThemeFont : ChartColors.lightThemeFont;
		const lines = UiSettings.colorsTheme === 'dark' ? ChartColors.darkThemeScales : ChartColors.lightThemeScales;

		return {
			tooltips: { mode: 'x-axis', intersect: false },
			scales: {
				yAxes: [{
					ticks: { 
						beginAtZero: true, 
						fontColor: font,
					},
					gridLines: { color: lines, }
				}],
				xAxes: [{ display: false }],
			},
			layout: {padding: {right: 7}},
			legend: { labels: { fontColor: font } },
			elements: {line: {tension: 0.1}},
			...p,
		};
	}

	
	/**
	 * Updates the colors (when the user toggles dark/light mode)
	 * of the chart / labels
	 * @returns the new state to set
	 */
	public static updateGraphColors(chartOpts: chartjs.ChartOptions, dataSetOpts: {
		dataSet: chartjs.ChartData,
		labelColorHm: {[label: string]: string},
	}) {


		// dark theme
		if (UiSettings.colorsTheme === 'dark') {
			chartOpts.legend.labels.fontColor = ChartColors.darkThemeFont;
			chartOpts.scales.yAxes[0].ticks.fontColor = ChartColors.darkThemeFont;
			chartOpts.scales.yAxes[0].gridLines.color = ChartColors.darkThemeScales;
		}
		// light theme
		else {
			chartOpts.legend.labels.fontColor = ChartColors.lightThemeFont;
			chartOpts.scales.yAxes[0].ticks.fontColor = ChartColors.lightThemeFont;
			chartOpts.scales.yAxes[0].gridLines.color = ChartColors.lightThemeScales;
		}

		if (dataSetOpts.dataSet && dataSetOpts.dataSet.datasets) {
			for (const d of dataSetOpts.dataSet.datasets) {
				d.borderColor = dataSetOpts.labelColorHm[d.label];
				d.backgroundColor = DataFormatterService.hexToRGB(dataSetOpts.labelColorHm[d.label], 0.1);
			}
		}
	}


}


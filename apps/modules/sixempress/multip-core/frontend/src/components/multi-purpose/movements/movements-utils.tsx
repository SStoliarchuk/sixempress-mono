import React from 'react';
import { Movement, MovementDirection, MovementMedium } from './Movement';
import { TimeService, DataFormatterService, MediaFileService } from '@sixempress/main-fe-lib';
import ReactDOMServer from 'react-dom/server';
import { MovementController } from './movement.controller';


export class MovementsUtils {

	/**
	 * Prints the movements table of the movements in the timeframe set
	 * @param from from the date to print
	 * @param to to the date to print
	 * @param movements if this param is given then the movements won't be fetched, but this array will be used
	 */
	public static async printTable(from: number, to: number, movements?: Movement[]) {

		if (!movements)
			movements = (await new MovementController().getMulti({params: {filter: {'date': {$gte: from, $lte: to}}}})).data;
		
		// TODO retrieve style from globals.css or embed the style in the jsx table generator

		// print data and style
		let toPrint = `
		<style>
			table.mov-table { 
				font-size: 1em; 
				border-collapse: collapse; 
				width: 100%; 
			}
			.mov-table td:first-child {
				text-align: center
			}
			.mov-table th:not(:nth-child(2)), 
			.mov-table td:not(:nth-child(2)) { 
				width: 1px 
			}
			.mov-table th, 
			.mov-table td { 
				border: 1px solid black; padding: 0 0.1em; 
			}
			.mov-table th:nth-child(3), 
			.mov-table td:nth-child(3) { 
				border-left: 0; border-right: 0; 
			}
			.mov-table th:nth-child(2), 
			.mov-table td:nth-child(2) { 
				border-right: 0; 
			}
			.mov-table th { 
				white-space: nowrap 
			}
			.mov-table td:not(:nth-child(2)) { 
				white-space: nowrap 
			}
		</style>

		<div style='margin-bottom: 10px'>
			<span>
				<b>Data di stampa:</b> ${DataFormatterService.formatUnixDate(TimeService.getCorrectMoment().unix())}
			</span>
			<span style='float: right'>
				<b>Intervallo di tempo:</b> da: ${DataFormatterService.formatUnixDate(from)} - a: ${DataFormatterService.formatUnixDate(to)}
			</span>
		</div>
		
		${
			ReactDOMServer.renderToStaticMarkup(
				MovementsUtils.getJsxMovementTableReport(movements)
			)
		}

		`;

		MediaFileService.printHtml(toPrint);
	}

	/**
	 * Generates the movements table report
	 * @param movs The movements to show
	 * @param showDetailedDate If true the date will be year/mothn/day hour:minute, if false then hour:minute 
	 */
	private static getJsxMovementTableReport(movs: Movement[]): JSX.Element {


		let totalInternalIn = 0;
		let totalInternalOut = 0;
		if (movs.length !== 0) { 
			movs = movs.sort((a, b) => a.date - b.date); 
			for (const m of movs) {
				if (m.direction === MovementDirection.internalInput)
					totalInternalIn += m.priceAmount;
				if (m.direction === MovementDirection.internalOutput)
					totalInternalOut += m.priceAmount;
			}
		}
		const showDetailedDate = movs.length !== 0 && DataFormatterService.formatUnixDate(movs[0].date, 'DD/MM/YYYY') !== DataFormatterService.formatUnixDate(movs[movs.length - 1].date, 'DD/MM/YYYY');
		const atLeastOnePos = movs.some(m => m.medium === MovementMedium.card);


		return (
			<table className='mov-table'>
				<tbody>
					{(totalInternalIn !== 0 || totalInternalOut !== 0) && (
						<tr>
							<th>Interno</th>
							<th/>
							<th/>
							{totalInternalIn !== 0 ? <th> € {DataFormatterService.centsToScreenPrice(totalInternalIn)}</th> : <th></th>}
							{totalInternalOut !== 0 ? <th> € {DataFormatterService.centsToScreenPrice(totalInternalOut)}</th> : <th></th>}
						</tr>
					)}
					<tr><td style={{border: 0}}>&nbsp;</td></tr>
					<tr>
						<th>Ora</th>
						<th>Descrizione</th>
						<th/>
						<th>Entrata</th>
						<th>Uscita</th>
					</tr>

					{movs.filter(m => m.direction !== MovementDirection.internalInput).map((m, idx) => (
						<tr key={m.priceAmount + idx}>
							<td>
								{showDetailedDate 
									? (<span>{DataFormatterService.formatUnixDate(m.date, 'DD/MM/YYYY')}<br/>{DataFormatterService.formatUnixDate(m.date, 'HH:mm')}</span>)  
									: DataFormatterService.formatUnixDate(m.date, 'HH:mm')
								}
							</td>

							<td>
								{m.description}
							</td>
							
							<td>{m.medium === MovementMedium.card ? 'POS' : ''}</td>

							{m.direction === MovementDirection.input
								? (
									<React.Fragment>
										<td>€ {DataFormatterService.centsToScreenPrice(m.priceAmount)}</td>
										<td/>
									</React.Fragment>
								)
								: (
									<React.Fragment>
										<td/>
										<td>€ {DataFormatterService.centsToScreenPrice(m.priceAmount)}</td>
									</React.Fragment>
								)
							}
						</tr>
					))}


					<tr><td style={{border: 0}}>&nbsp;</td></tr>
					<tr><td style={{border: 0}}>&nbsp;</td></tr>
					<tr><th colSpan={5}>Somma movimenti</th></tr>
					<tr>
						<th> Totali </th>
						<th/>
						<th/>
						<th> € {DataFormatterService.centsToScreenPrice(movs.filter(d => d.direction === MovementDirection.input).reduce((car, cur) => car += cur.priceAmount , 0))} </th>
						<th> € {DataFormatterService.centsToScreenPrice(movs.filter(d => d.direction === MovementDirection.output).reduce((car, cur) => car += cur.priceAmount , 0))} </th>
					</tr>
					<tr>
						<th> Somma </th>
						<th/>
						<th/>
						<th colSpan={2}> 
							{'€ ' + DataFormatterService.centsToScreenPrice(
								movs.filter(d => d.direction === MovementDirection.input).reduce((car, cur) => car += cur.priceAmount , 0) -
								movs.filter(d => d.direction === MovementDirection.output).reduce((car, cur) => car += cur.priceAmount , 0)
							)}
						</th>
					</tr>
					{atLeastOnePos && (
						<React.Fragment>
							<tr><td>&nbsp;</td></tr>
							<tr><th colSpan={5}>POS</th></tr>
							<tr>
								<th> Totale POS </th>
								<th/>
								<th/>
								<th> € {DataFormatterService.centsToScreenPrice(movs.filter(d => d.direction === MovementDirection.input && d.medium === MovementMedium.card).reduce((car, cur) => car += cur.priceAmount , 0))} </th>
								<th> € {DataFormatterService.centsToScreenPrice(movs.filter(d => d.direction === MovementDirection.output && d.medium === MovementMedium.card).reduce((car, cur) => car += cur.priceAmount , 0))} </th>
							</tr>
		
							<tr><td>&nbsp;</td></tr>
							<tr><th colSpan={5}>Somma movimenti senza POS</th></tr>
							<tr>
								<th> Totali </th>
								<th/>
								<th/>
								<th> € {DataFormatterService.centsToScreenPrice(movs.filter(d => d.direction === MovementDirection.input && d.medium !== MovementMedium.card).reduce((car, cur) => car += cur.priceAmount , 0))} </th>
								<th> € {DataFormatterService.centsToScreenPrice(movs.filter(d => d.direction === MovementDirection.output && d.medium !== MovementMedium.card).reduce((car, cur) => car += cur.priceAmount , 0))} </th>
							</tr>
							<tr>
								<th> Somma </th>
								<th/>
								<th/>
								<th colSpan={2}> 
									{ '€ ' + DataFormatterService.centsToScreenPrice(
										movs.filter(d => d.direction === MovementDirection.input && d.medium !== MovementMedium.card).reduce((car, cur) => car += cur.priceAmount , 0) -
										movs.filter(d => d.direction === MovementDirection.output && d.medium !== MovementMedium.card).reduce((car, cur) => car += cur.priceAmount , 0)
									)}
								</th>
							</tr>
						</React.Fragment>
					)}
					<tr><td>&nbsp;</td></tr>
					<tr><th colSpan={5}>Somma Esterna ed Interna</th></tr>
					<tr>
						<th> { atLeastOnePos ? 'Senza POS' : 'Totale' } </th>
						<th/>
						<th/>
						<th colSpan={2}> 
							{ '€ ' + DataFormatterService.centsToScreenPrice(
								(movs.filter(d => (d.direction === MovementDirection.input) && d.medium !== MovementMedium.card).reduce((car, cur) => car += cur.priceAmount , 0) + totalInternalIn) -
								(movs.filter(d => d.direction === MovementDirection.output && d.medium !== MovementMedium.card).reduce((car, cur) => car += cur.priceAmount , 0) + totalInternalOut)
							)}
						</th>
					</tr>
					{atLeastOnePos && (
						<tr>
							<th> Somma Esterna, Interna e POS </th>
							<th/>
							<th/>
							<th colSpan={2}> 
								{ '€ ' + DataFormatterService.centsToScreenPrice(
									(movs.filter(d => (d.direction === MovementDirection.input)).reduce((car, cur) => car += cur.priceAmount , 0) + totalInternalIn) -
									(movs.filter(d => d.direction === MovementDirection.output).reduce((car, cur) => car += cur.priceAmount , 0) + totalInternalOut)
								)}
							</th>
						</tr>
					)}
				</tbody>
			</table>
		);
	}

}

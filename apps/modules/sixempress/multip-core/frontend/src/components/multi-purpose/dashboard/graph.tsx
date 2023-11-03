import Paper from '@material-ui/core/Paper';
import Box from '@material-ui/core/Box';
import { CircularProgress } from '@material-ui/core';
import { TimeService } from '@sixempress/main-fe-lib';
import React from 'react';
import { Movement, MovementDirection } from '../movements/Movement';
import { MovementController } from '../movements/movement.controller';
import { MovementsGraph } from "../movements/page/graph/movements-graph";

interface GState {
	lastRequestMs: number,
	movements: null | Movement[],
	from: number,
	to: number,
}

export class Graph extends React.Component<{}, GState> {

	state: GState = {
		movements: null,
		lastRequestMs: 0,
		from: TimeService.getCorrectMoment().startOf('M').subtract(4, 'days').unix(),
		to: TimeService.getCorrectMoment().endOf('M').unix(),
	}

	componentDidMount() {
		this.updateTimeframe(this.state.from, this.state.to);
	}

	private updateTimeframe = async (from: number, to: number) => {
		const r = await new MovementController().getMulti({
			disableLoading: true,
			params: {
				filter: { date: { $gte: from,  $lte: to }, direction: {$in: [MovementDirection.input, MovementDirection.output]} },
				limit: -1,
				schema: {date: 1, direction: 1, priceAmount: 1},
			}, 
		});
		this.setState({...this.getMovDataState(r.data), from, to});
	}

	private getMovDataState(movs: Movement[]): Pick<GState, 'movements' | 'lastRequestMs'> {
		return {
			movements: movs.sort((a, b) => b.date - a.date),
			lastRequestMs: new Date().getTime(),
		}
	}

	render() {

		if (this.state.movements === null)
			return (
				<Box mt={1}>
					<Paper>
						<Box textAlign='center' p={3}>
							<CircularProgress color='inherit'/>
						</Box>
					</Paper>
				</Box>
			)

		return (
			<div>
				<MovementsGraph 
					defaultStep='day'
					movements={this.state.movements} 
					from={this.state.from} 
					to={this.state.to} 
					// onGraphClick={false}
				/>
			</div>
		)
	}

}
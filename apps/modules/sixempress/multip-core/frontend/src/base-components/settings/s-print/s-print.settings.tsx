import React from 'react';
import Paper from '@material-ui/core/Paper';
import { FieldsFactory } from '@sixempress/main-fe-lib';
import { SPrintService } from 'apps/modules/sixempress/multip-core/frontend/src/services/s-print/s-print.service';
import { PrinterTypes } from 'apps/modules/sixempress/multip-core/frontend/src/services/s-print/s-print.dtd';
import { SeasService } from 'apps/modules/sixempress/multip-core/frontend/src/services/seas/seas.service';
import CircularProgress from '@material-ui/core/CircularProgress';

interface SPSState {
	isActive: boolean;
	nodesReady: boolean,
	byType: {[PrinterType: number]: {machineId: string}},
	nodes: Array<{machineId: string, online: boolean}>,
}

export class SPrintSettings extends React.Component<{}, SPSState> {

	constructor(p) {
		super(p);

		this.state = {
			isActive: SPrintService.isActive,
			nodesReady: false,
			byType: SPrintService.configurations,
			nodes: [],
		};

	}

	async componentDidMount() {
		SeasService.onSeasNodesChange.registerAction(this.updateListNodes);
		await SeasService.updateAvailableNodesList();
		this.setState({nodesReady: true})
	}
	
	componentWillUnmount() {
		SeasService.onSeasNodesChange.removeAction(this.updateListNodes);
	}
	
	private updateListNodes = () => {
		const nodes: SPSState['nodes'] = SeasService.availableAddonsNodes
			.map(n => ({machineId: n.description.id, online: true}))
			.filter(n => n.machineId);

		// add offline nodes
		for (const t in this.state.byType)
			if (!nodes.some(n => n.machineId === this.state.byType[t].machineId))
				nodes.push({machineId: this.state.byType[t].machineId, online: false});

		this.setState({nodes});
	};

	private onToggle = (e: React.MouseEvent<any>) => {
		const field = e.currentTarget.dataset.field;
		const newValue = !this.state[field];
		this.setState({[field]: newValue} as any);
		SPrintService.isActive = newValue;
	}

	private onClickCheckbox = async (e: React.MouseEvent<any>) => { 
		const {id, type} = e.currentTarget.dataset;
		const value = (e.target as any).checked;
		
		this.setState(
			(s) => {
				const bt = {...this.state.byType};
				if (!value)
					delete bt[type]
				else  
					bt[type] = {machineId: id}

				return {byType: bt};
			},
			() => SPrintService.configurations = this.state.byType,
		);

		// SPrintService.setIpsConfig({[this.defaultKey]: {socketId: }});
		// const target = SeasService.availableAddonsNodes[e.currentTarget.dataset.idx];
		// await WebRTCService.createConnection(target.id);
		// const res = await WebRTCService.emitWithReturn(target.id, WebRTCCodes.getLabelPrinterList, {asd: 1});
		// // const res = await WebRTCService.emitWithReturnFallbackSocket(target.id, WebRTCCodes.getLabelPrinterList, {asd: 1});
		// console.log(res ? res : String(res));
	}

	render() {

		return (
			<Paper className='def-box'>
				<div>
					<FieldsFactory.Switch
						label="Stampa semplice"
						data-field={"isActive"}
						checked={this.state.isActive}
						onClick={this.onToggle}
					/>
				</div>
				{!this.state.nodesReady
					? (
						<Paper className='def-box'>
							<CircularProgress/>
						</Paper>
					)
					: 
					
					!this.state.nodes.length
					? <div>Nessun dispositivo disponibile</div>

					:(
						this.state.nodes.map((n) => (
							<div key={n.machineId}>
								<div>
									Dispositivo {!n.online && <b>Offline</b>}: {n.machineId.slice(0, 20) + '..'}
								</div>
								<div>
									<FieldsFactory.Checkbox
										data-id={n.machineId}
										data-type={PrinterTypes.document}
										onClick={this.onClickCheckbox}
										checked={this.state.byType[PrinterTypes.document]?.machineId === n.machineId}
										label='Documenti'
									/>
								</div>
								<div>
									<FieldsFactory.Checkbox
										data-id={n.machineId}
										data-type={PrinterTypes.receipt}
										onClick={this.onClickCheckbox}
										checked={this.state.byType[PrinterTypes.receipt]?.machineId === n.machineId}
										label='Scontrini'
									/>
								</div>
								<div>
									<FieldsFactory.Checkbox
										data-id={n.machineId}
										data-type={PrinterTypes.label}
										onClick={this.onClickCheckbox}
										checked={this.state.byType[PrinterTypes.label]?.machineId === n.machineId}
										label='Etichette'
									/>
								</div>
							</div>
						))
					)
				}

			</Paper>
		);
	}

}

import React from 'react';
import Box from '@material-ui/core/Box';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';
import Divider from '@material-ui/core/Divider';
import Button from '@material-ui/core/Button';
import { DtSettingsPopoverProps, DSPState } from "./dtd";
import InputLabel from '@material-ui/core/InputLabel';
import Delete from '@material-ui/icons/Delete';
import ArrowLeft from '@material-ui/icons/ArrowLeft';
import ArrowRight from '@material-ui/icons/ArrowRight';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import Grid from '@material-ui/core/Grid';
import { SmallUtils } from '@sixempress/utilities';
import KeyboardBackspace from '@material-ui/icons/KeyboardBackspace';
import { FieldsFactory } from '../../fields/fields-factory';
import { SelectFieldValue } from '../../fields/dtd';
import { LibSmallUtils } from '../../../utils/various/small-utils';


export class DtSettingsPopover extends React.Component<DtSettingsPopoverProps, DSPState> {

	constructor(p: DtSettingsPopoverProps) {
		super(p);

		// filterByColIdx: parseInt(this.props.dtApi.state().order[0][0].toString()),
		// filterDirection: this.props.dtApi.state().order[0][1] as unknown as 'asc' | 'desc',
		// const stateCol = this.props.dtApi.state().columns;

		const sett = p.getDtSettings();

		this.state = {
			columns: [],
			tableIdx: sett.tableIdx,
			tableName: sett.tableName,
			filterByColIdx: sett.order[0],
			filterDirection: sett.order[1],
		};
		
		for (let i = 0; i < sett.columns.length - 1; i++) {
			this.state.columns.push({
				visible: sett.columns[i].visible,
				title: sett.columns[i].title,
				orderable: sett.columns[i].orderable !== false,
				data: sett.columns[i].data,
			});
		}

	}
	
	changeOrderDirection = () => {
		const newValue = this.state.filterDirection === 'asc' ? 'desc' : 'asc';
		this.setState({filterDirection: newValue});
	}


	changeOrderBy = (event) => {
		if (event.target.value !== this.state.filterByColIdx) {
			this.setState({filterByColIdx: event.target.value});
		}
	}


	handleColumnToggle = (e: React.MouseEvent<any>) => {
		const idx = e.currentTarget.dataset.idx;
		// if last visible then don't toggle
		const lastShownColumn = this.state.columns.filter(c => c.visible && c.title).length === 1;
		if (lastShownColumn && this.state.columns[idx].visible) {
			LibSmallUtils.notify('Impossibile nascondere l\'ultima colonna', 'info');
		}
		else {
			const curr = [...this.state.columns];
			curr[idx].visible = !curr[idx].visible;
			this.setState({columns: curr});
		}

	}

	reset = () => {
		this.setState(s => {
			const cols = [...s.columns];
			cols.forEach(c => c.visible = true);
			return {columns: cols};
		}, () => this.applySettings());
	}

	applySettings = () => {
		this.props.onApply({
			columns: this.state.columns,
			order: [this.state.filterByColIdx, this.state.filterDirection],
			tableName: this.state.tableName || "# " + this.state.tableIdx,
			tableIdx: this.state.tableIdx,
		});
	}

	private deleteTable = () => {
		this.props.onDeleteTable(this.state.tableIdx)
	}

	private changeTableIdx = (e: React.MouseEvent<any>) => {
		const toAdd = e.currentTarget.dataset.toAdd;
		this.setState({tableIdx: this.state.tableIdx + (toAdd ? 1 : -1) })
	}

	render() {
		const props = this.props;

		return (
			<>
				<Box maxWidth='50em' p={2}>
					<Box display='flex' alignItems='center'>
						<div>
							<Button onClick={this.applySettings} color='primary' variant='contained'>Applica</Button>
							<Button onClick={this.reset} >Reimposta</Button>
						</div>
						<Box flexGrow={1} textAlign='right'>
							<IconButton onClick={props.onClose}>
								<CloseIcon/>
							</IconButton>
						</Box>
					</Box>
					<Divider/>
					{this.state.tableIdx !== -1 && (
						<>
							<Box m={2} display='flex' alignItems='center'>
								<FieldsFactory.TextField
									label="Nome tavola"
									fullWidth
									value={this.state.tableName}
									onChange={(e) => {
										const v = e.currentTarget.value;
										this.setState({tableName: v});
									}}
								/>
								{this.props.onDeleteTable && (
									<Box ml={1}>
										<IconButton data-testid="delete-available-dttable-button" onClick={this.deleteTable}>
											<Delete/>
										</IconButton>
									</Box>
								)}
							</Box>
							<div className='text-center'>
								<InputLabel>Posizione tavola</InputLabel>
								<Box mb={1} display='flex' alignItems='center' justifyContent='center'>
									<IconButton disabled={this.state.tableIdx === 0} onClick={this.changeTableIdx}>
										<ArrowLeft/>
									</IconButton>
									<div>
										{this.state.tableIdx + 2}
									</div>
									<IconButton disabled={this.state.tableIdx + 1 === this.props.allVariantsTableLength} onClick={this.changeTableIdx} data-to-add={true}>
										<ArrowRight/>
									</IconButton>
								</Box>
							</div>
							<Divider/>
						</>
					)}
					<Box m={2} mt={1} display='flex' alignItems='center'>
						<FieldsFactory.SelectField
							value={this.state.filterByColIdx}
							onChange={this.changeOrderBy}
							variant='outlined'
							fullWidth
							label="Ordina per"
							values={this.state.columns.reduce<SelectFieldValue[]>((car, cur, idx) => {
								if (!cur.title || !cur.orderable) {
									return car;
								}
								car.push({label: cur.title, value: idx});
								return car;
							}, [])}
						/>
						<Box ml={1}>
							<IconButton onClick={this.changeOrderDirection}>
								<KeyboardBackspace className={'dt-settings-order-dir-icon ' + this.state.filterDirection}/>
							</IconButton>
						</Box>
					</Box>
					<Divider />
					<Box m={2}>
						Visibilita colonne
						<Grid container spacing={1} >
							{this.state.columns.map((col, idx) => col.title ? (
								<Grid key={idx} item xs={12} sm={6}>
									<FormControlLabel
										value="start"
										control={<Switch onClick={this.handleColumnToggle} data-idx={idx} checked={col.visible} color="primary" />}
										label={col.title}
									/>
								</Grid>
							) : (null))}
						</Grid>
					</Box>
				</Box>
			</>
		);
	}

}

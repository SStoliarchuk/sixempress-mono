import React from 'react';
import { FromDateToDateFilter } from './datetime-filter/datetime-filter.component';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import { DtSelectFilter } from './select-filter/select-filter.component';
import { ISelectFilterOptions } from './select-filter/dtd';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';
import { DtFiltersProps } from './dtd';
import { DtTimeFilterField } from './datetime-filter/dtd';
import { TimeService } from '../../../services/time-service/time-service';
import { AFCField } from './amts-filter/dtd';
import { AmtsFilterComponent } from './amts-filter/amts-filter.component';
import { FieldsFactory } from '../../fields/fields-factory';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import { ModalService } from '../../../services/modal-service/modal.service';
import { ModalComponentProps } from '@sixempress/theme';
import { TutorialNodeIds } from '../../../utils/enums/tutorial-keys.enum';
import { Popover } from '@material-ui/core';


function NewTableNameModal(p: {onConfirm: (name: string) => void} & ModalComponentProps) {

	const [t, sT] = React.useState("");

	const sub = (e: React.FormEvent) => {
		e.preventDefault();
		if (t)
			p.onConfirm(t);
	};

	return (
		<form onSubmit={sub}>
			<DialogContent>
				<FieldsFactory.TextField
					label="Nome tavola"
					value={t}
					autoFocus
					onChange={(e) => sT(e.currentTarget.value)}
					error={!t}
				/>
			</DialogContent>
			<DialogActions>
				<Button color='primary' type='submit' disabled={!t}>Conferma</Button>
			</DialogActions>
		</form>
	)
}

interface DFCState {
	savetablepopover: {
		open: boolean,
		HTMLElement: null | HTMLElement
	}
}

export class DtFiltersComponent extends React.Component<DtFiltersProps<any>, DFCState> {

	state: DFCState = {
		savetablepopover: {open: false, HTMLElement: null}
	}

	private timeFields: DtTimeFilterField<any>[] = [];
	private selectFieldsOutput = {};

	private selectFields: ISelectFilterOptions<any>[] = [];
	private timeFieldsOutput = {};

	private amtsFields: AFCField<any>[] = [];
	private amtsFieldsOutput = {};


	/**
	 * Setups the initial data
	 * (it's a constructor it is HIS job to constructor the class ._.)
	 */
	constructor(props: DtFiltersProps<any>) {
		super(props);

		if (props.addCreationTimeFilter !== false) {
			// add creation date
			this.timeFields.push({
				modelPath: '_created._timestamp' as any,
				label: 'Data di creazione', 
				canDisable: (props.timeFields || []).length !== 0 || (props.selectFields || []).length !== 0,
				enabled: (props.timeFields || []).length === 0 && (props.selectFields || []).length === 0,
				value: {from: TimeService.getCorrectDate(), to: TimeService.getCorrectDate()},
			});
		}
		
		if (props.timeFields) {
			this.timeFields.push(...props.timeFields);
		}
		if (props.selectFields) {
			this.selectFields = props.selectFields;
		}
		if (props.amtsFields) {
			this.amtsFields = props.amtsFields;
		}

	}


	/**
	 * Returns the filters to use inside the mongo query
	 * OR
	 * an undefined if no filter has to be set
	 */
	public getFilterData(): object | undefined {

		let filters: any = {};
		
		// add multiselect firts and then time filter in case there is a field that is used by both
		// and the time filter has a higher priority
		// as a select filter on a time field can be either {$exists: true} or {$exists: false}

		if (Object.keys(this.selectFieldsOutput).length !== 0) {
			filters = {...filters, ...this.selectFieldsOutput};
		}

		if (Object.keys(this.timeFieldsOutput).length !== 0) {
			filters = {...filters, ...this.timeFieldsOutput};
		}

		if (Object.keys(this.amtsFieldsOutput).length !== 0) {
			filters = {...filters, ...this.amtsFieldsOutput};
		}

		// give
		return filters;
	}

	private applyHandler = () => {
		this.props.onApply(this.getFilterData());
	}
	private resetHandler = () => {
		this.props.onApply({});
	}
	private onClickSaveFilters = () => {
		this.props.saveFilters(this.getFilterData());
	}
	private onClickSaveFiltersAsNewTable = (e: React.MouseEvent<any>) => {
		this.setState({savetablepopover: {open: true, HTMLElement: e.currentTarget as HTMLElement}});
	}

	private onCreateNewTable = (name: string) => {
		this.props.saveAsNewTable(name, this.getFilterData());
		this.setState({savetablepopover: {...this.state.savetablepopover, open: false}})
	}

	render() {
		return (
			<>
				<Popover 
					open={this.state.savetablepopover.open} 
					anchorEl={this.state.savetablepopover.HTMLElement} 
					onClose={() => this.setState({savetablepopover: {...this.state.savetablepopover, open: false}})}
				>
					<NewTableNameModal onConfirm={this.onCreateNewTable} />
				</Popover>
				<Box maxWidth='90vw' p={2}>
					
					<Box display='flex' alignItems='center'>
						<div>
							<Button onClick={this.applyHandler} color='primary' variant='contained' data-testid={TutorialNodeIds.tableFilterPopupApply}>Applica</Button>
							<Button onClick={this.resetHandler}>Rimuovi filtri</Button>
						</div>
						<Box flexGrow={1} textAlign='right'>
							<IconButton onClick={this.props.onClose}>
								<CloseIcon/>
							</IconButton>
						</Box>
					</Box>
					
					<Divider/>

					{this.timeFields.length !== 0 && (
						<FromDateToDateFilter
							timeFields={this.timeFields}
							inputData={this.props.initialFilter}
							outputData={this.timeFieldsOutput}
						/>
					)}

					{this.selectFields.length !== 0 && (
						<Box mt={4}>
							<Typography style={{marginLeft: '0.4em'}}>
								Filtro contenuto
							</Typography>
							<DtSelectFilter 
								fields={this.selectFields} 
								inputData={this.props.initialFilter}
								outputData={this.selectFieldsOutput}
							/>
						</Box>			
					)}

					{this.amtsFields.length !== 0 && (
						<Box mt={1}>
							<AmtsFilterComponent 
								fields={this.amtsFields}
								inputData={this.props.initialFilter}
								outputData={this.amtsFieldsOutput} 
							/>
						</Box>			
					)}

				</Box>
				<Divider/>
				<Box m={1} textAlign='right'>
					{this.props.saveFilters && <Button color='primary' onClick={this.onClickSaveFilters}>Salva</Button>}
					<Button color='primary' variant='outlined' onClick={this.onClickSaveFiltersAsNewTable}>Salva nuova tavola</Button>
				</Box>
			</>
		);
	}

}

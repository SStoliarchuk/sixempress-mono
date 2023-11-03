import React from 'react';
import { Datatable } from '../dt-logic/datatable';
import Paper from '@material-ui/core/Paper';
import Box from '@material-ui/core/Box';
import IconButton from '@material-ui/core/IconButton';
import Badge from '@material-ui/core/Badge';
import Tooltip from '@material-ui/core/Tooltip';
import Popover, { PopoverOrigin } from '@material-ui/core/Popover';
import FilterList from '@material-ui/icons/FilterList';
import { IBaseModel } from '../../../services/controllers/IBaseModel';
import { DtFiltersComponent } from '../dt-filters/dt-filters.component';
import Settings from '@material-ui/icons/Settings';
import { DtSettingsPopover } from '../dt-settings/dt-settings';
import { ABDTState, ABDTProps } from './dtd';
import { AbstractBasicDtLogic } from './abstract-basic-dt.logic';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Divider from '@material-ui/core/Divider';
import { DtSettings } from '../dt-settings/dtd';
import { DataStorageService } from '@sixempress/utilities';
import { CacheKeys } from '../../../utils/enums/cache-keys.enum';
import { TutorialNodeIds } from '../../../utils/enums/tutorial-keys.enum';

export abstract class AbstractBasicDt<T extends IBaseModel, P extends ABDTProps<T> = ABDTProps<T>, S  extends ABDTState = ABDTState> extends AbstractBasicDtLogic<T, P, S> {

	protected anchorCache: PopoverOrigin = {vertical: 'top', horizontal: 'right'};

	protected possibleRowsPerPage = [10, 15, 20, 25, 50];

	/**
	 * Properties and function for filters-popup
	 */

	private openFiltersFn = (event?: React.MouseEvent<any>) => {
		this.setState({popoverFilters: event.currentTarget});
	}
	private closeFiltersFn = (e?: any) => {
		this.setState({popoverFilters: null});
	}
	private applyFiltersFn = (filters: object) => { 
		// prevent reload if there were no filters set previously
		this.closeFiltersFn();
		this.setState({dtFiltersComponentValue: filters}, () => this.reloadTable());
	}

	private saveFilters = (f: object) => {
		this.closeFiltersFn();
		this.setState(s => {
			const tbs = [...s.availableTables];
			tbs[s.selectedTableIdx].filters = f;
			DataStorageService.localStorage.setItem(CacheKeys.dataTableAvailableTablesPrefix + (this.controller.bePath), JSON.stringify(tbs));

			return {availableTables: tbs, dtFiltersComponentValue: f};
		}, () => this.reloadTable());
	}

	private saveFiltersAsNewTable = (tableName: string, f: object) => {
		this.closeFiltersFn();
		this.setState(s => {
			const tbs = [...s.availableTables];
			tbs.push({ name: tableName, filters: f, });
			DataStorageService.localStorage.setItem(CacheKeys.dataTableAvailableTablesPrefix + (this.controller.bePath), JSON.stringify(tbs));

			return {availableTables: tbs, selectedTableIdx: tbs.length - 1, dtFiltersComponentValue: f};
		});
	}



	/**
	 * Properties and function for settings-popup
	 */

	private openSettingsFn = (event?: React.MouseEvent<any>) => {
		this.setState({popoverSettings: event.currentTarget});
	}
	private closeSettingsFn = () => {
		this.setState({popoverSettings: null});
	}
	private applySettingsFn = (setts: DtSettings) => {
		this.closeSettingsFn();

		// we trigger after the setState to use the correct cache key for the datatable
		// we use the table idx as cache key, so we trigger this after the table has been moved for the correct key
		const cols = () => {
			this.dtTable.current.changeColumnVisibility(setts.columns.map((c, idx) => ({idx, vis: c.visible})));
			this.dtTable.current.setOrder(setts.order[0], setts.order[1]);
		};

		
		// name
		if (setts.tableIdx !== -1) {
			this.setState(s => {
				const tbs = [...s.availableTables];
				// move the table
				if (setts.tableIdx !== s.selectedTableIdx) {
					tbs.splice(setts.tableIdx, 0, tbs.splice(s.selectedTableIdx, 1)[0]);
				}

				// renombre
				tbs[setts.tableIdx].name = setts.tableName;

				DataStorageService.localStorage.setItem(CacheKeys.dataTableAvailableTablesPrefix + (this.controller.bePath), JSON.stringify(tbs));
				return {availableTables: tbs, selectedTableIdx: setts.tableIdx};
			}, () => cols());
		}
		else {
			cols();
		}
	}

	private getDtSettings = (): DtSettings => {

		const currDtState = this.dtTable.current.getState();
		const order = currDtState.sort;

		const cols: DtSettings['columns'] = [];
		for (let idx = 0; idx < currDtState.columns.length; idx++) {
			if (!this.state.dtInput.columns[idx]) { continue; }

			cols.push({
				visible: currDtState.columns[idx].visible,
				data: this.state.dtInput.columns[idx].data as string,
				title: this.state.dtInput.columns[idx].title,
				orderable: this.state.dtInput.columns[idx].orderable,
			});
		}

		const toR: DtSettings = {
			columns: cols,
			order: [order.column, order.dir],
			tableIdx: this.state.selectedTableIdx,
			tableName: this.state.selectedTableIdx === -1 ? undefined : this.state.availableTables[this.state.selectedTableIdx].name,
		};

		return toR;
	}

	private onDeleteTable = (idx: number) => {
		this.closeSettingsFn();
		this.setState(s => {
			const tbs = [...s.availableTables];
			if (tbs[idx]) { tbs.splice(idx, 1); }
			DataStorageService.localStorage.setItem(CacheKeys.dataTableAvailableTablesPrefix + (this.controller.bePath), JSON.stringify(tbs));
			return {availableTables: tbs, dtFiltersComponentValue: {}, selectedTableIdx: -1};
		});
	}


	private onClickTableTab = (e: React.MouseEvent<any>) => {
		const idx = parseInt(e.currentTarget.dataset.idx);
		this.setState(s => {
			if (s.selectedTableIdx !== idx) { 
				return {selectedTableIdx: idx, dtFiltersComponentValue: s.availableTables[idx] ? s.availableTables[idx].filters : {}};
			}
		});
	}

	
	render() {
		
		if (!this.state.dtInput) { return <Paper/>; }

		return (
			<Paper>
				{this.state.availableTables.length !== 0 && (
					<>
						<Tabs
							scrollButtons='off'
							value={this.state.selectedTableIdx + 1}
							indicatorColor="primary"
							variant="scrollable"
							textColor="primary"
						>
							<Tab label="Base" data-idx={-1} onClick={this.onClickTableTab}/>
							{this.state.availableTables.map((t, idx) => (
								<Tab key={t.name + idx} label={t.name} data-idx={idx} onClick={this.onClickTableTab}/>
							))}
						</Tabs>
						<Divider/>
					</>
				)}
				<Datatable 
					key={this.state.selectedTableIdx}
					ref={this.dtTable} 
					saveStateCacheKey={CacheKeys.dataTableStoragePrefix + "/" + (this.controller.bePath) + this.state.selectedTableIdx}
					possibleRowsPerPage={this.possibleRowsPerPage}
					select={'single'}
					removeSelectVisualColumn={true}
					removePaper={true}
					{...this.state.dtInput}
				/> 
			</Paper>
		);
	}
	

	/**
	 * Returns options/filters/search etc
	 */
	protected toolbarAddition = () => {

		return (
			<>
				
				{/* TODO generate the dt buttons here isntead of letting the dt generate them */}

				<Box whiteSpace='nowrap' data-testid={TutorialNodeIds.tableFilterAndSettings}>
					<Badge color="error" variant={Object.keys(this.state.dtFiltersComponentValue).length === 0 ? undefined : 'dot'} className='mui-badge-fix'>
						<Tooltip title='Filtri tabella'>
							<IconButton onClick={this.openFiltersFn} >
								<FilterList/>
							</IconButton>
						</Tooltip>
					</Badge>

					<Tooltip title='Impostazioni tabella'>
						<IconButton onClick={this.openSettingsFn}>
							<Settings/>
						</IconButton>
					</Tooltip>
				</Box>


				<Popover
					open={Boolean(this.state.popoverFilters)}
					anchorEl={this.state.popoverFilters}
					onClose={this.closeFiltersFn}
					anchorOrigin={this.anchorCache}
					transformOrigin={this.anchorCache}
				>
					<DtFiltersComponent 
						onClose={this.closeFiltersFn} 
						onApply={this.applyFiltersFn} 
						initialFilter={this.state.dtFiltersComponentValue} 
						saveFilters={this.state.selectedTableIdx !== -1 && this.saveFilters}
						saveAsNewTable={this.saveFiltersAsNewTable}
						{...this.filterSettings}
					/>
				</Popover>

				<Popover
					open={Boolean(this.state.popoverSettings)}
					anchorEl={this.state.popoverSettings}
					onClose={this.closeSettingsFn}
					anchorOrigin={this.anchorCache}
					transformOrigin={this.anchorCache}
				>
					<DtSettingsPopover 
						allVariantsTableLength={this.state.availableTables.length}
						getDtSettings={this.getDtSettings}
						onDeleteTable={this.state.selectedTableIdx !== -1 && this.onDeleteTable}
						onClose={this.closeSettingsFn} 
						onApply={this.applySettingsFn}
					/>
				</Popover>
			</>
		);
	}

}

import React from 'react';
import Paper from "@material-ui/core/Paper";
import Box from "@material-ui/core/Box";
import Switch from "@material-ui/core/Switch";
import Delete from "@material-ui/icons/Delete";
import { TableInput, FieldsFactory, DataFormatterService, TableBody, ResponsiveTable, TableHead,  SelectFieldValue, BusinessLocationsService } from '@sixempress/main-fe-lib';
import { AuthService } from '@sixempress/abac-frontend';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import IconButton from '@material-ui/core/IconButton';
import Close from '@material-ui/icons/Close';
import Button from '@material-ui/core/Button';
import { ProductAmountListLogic } from './product-amount-list.logic';
import MenuItem from '@material-ui/core/MenuItem';
import Menu from '@material-ui/core/Menu';
import { PALProps, PALState } from './product-amount-list.dtd';
import { ProductsJsxRender } from '../products-render';

export abstract class ProductAmountList<P extends PALProps = PALProps, S extends PALState = PALState> extends ProductAmountListLogic<P, S> {
	
	protected isSaving = false;

	protected handleSaveBtn = () => {
		if (this.isSaving)
			return
		this.isSaving = true;

		this.save().finally(() => this.isSaving = false);
	}

	protected abstract save(): Promise<any>;
	
	protected handleRemoveProduct = (e: React.MouseEvent<any>) => {
		const gId = e.currentTarget.dataset.groupId;
		const pId = e.currentTarget.dataset.id;

		this.removeProduct(gId, pId);
	}

	protected handleAmountChange = (e: React.ChangeEvent<any>) => {
		const newValue = parseInt(e.currentTarget.value) || 0;
		const datasetTarget = (e.nativeEvent.target as any).parentElement.parentElement.dataset;

		const gId = datasetTarget.groupId;
		const pId = datasetTarget.id;
		const locationId = datasetTarget.locationId;

		this.changeProductAmount(gId, pId, locationId, newValue);
	}

	protected handleAddComplexLocation = (e: React.MouseEvent<any>) => {
		const gId = e.currentTarget.dataset.groupId;
		const pId = e.currentTarget.dataset.id;
		const locationId = e.currentTarget.dataset.locationId;

		this.addLocation(gId, pId, locationId);
	}

	protected handleRemoveComplexLocation = (e: React.MouseEvent<any>) => {
		const gId = e.currentTarget.dataset.groupId;
		const pId = e.currentTarget.dataset.id;
		const locationId = e.currentTarget.dataset.locationId;

		this.removeLocation(gId, pId, locationId);
	}

	protected handleChangeComplexLocation = (e: React.ChangeEvent<any>) => {
		const newValue = e.target.value;
		const datasetTarget = e.currentTarget.parentElement.parentElement.parentElement.dataset;

		const gId = datasetTarget.groupId;
		const pId = datasetTarget.id;
		const locId = datasetTarget.locationId;

		this.changeLocation(gId, pId, locId, newValue);
	}

	protected handleOpenAddComplexLocationPopover = (e: React.MouseEvent<any>) => {
		const gId = e.currentTarget.dataset.groupId;
		const pId = e.currentTarget.dataset.id;

		this.setState({addComplexLocationPopover: {anchor: e.currentTarget, gId, pId}});
	}

	protected handleCloseAddComplexLocationPopover = () => {
		this.setState({addComplexLocationPopover: null});
	}

	protected handleOpenAddProductToListModal = () => {
		this.openProductsTable();
	}

	protected handleToggleSimpleMode = () => {
		this.toggleSimpleMode();
	}

	protected handleSimpleLocationIdChange = (e: React.ChangeEvent<any>) => {
		const newValue = e.target.value;
		this.changeSimpleModeLocationId(newValue);
	}


	render() {

		return (
			<>
				{this.getAddComplexLocationPopover()}

				<Paper>
					<Box py={2}>
						{this.getTable()}
						<Box ml={2} mt={2}>
							<Button color='primary' onClick={this.handleOpenAddProductToListModal}>Aggiungi elemento</Button>
						</Box>
					</Box>
				</Paper>
			</>
		);
	}

	protected getTable() {
		return (
			<ResponsiveTable
				headTh={this.getTableHead()}
				bodyTr={this.getTableBody()}
				configuration={	{
					tableContainerProps: this.props.expandTable ? { className: 'def-box-expand' } : undefined,
					tableProps: { className: 'prod-qt-table' },
					responsive: { breakPoint: 'md' }
				} }
			/>
		);
	}


	/**
	 * Returns a list of locations ids that are not present in the complex products list
	 */
	protected availableComplexLocationsLeft(gId: string, pId: string): string[] {
		const locationAlreadyChosen = Object.keys(this.state.products[gId][pId].amounts);
		const toR: string[] = [];
		for (const l of this.allLocations) {
			if (!locationAlreadyChosen.includes(l._id)) {
				toR.push(l._id);
			}
		}
		return toR;
	}

	/**
	 * Returns the popover to use when adding new locations to a complex add mode
	 */
	protected getAddComplexLocationPopover() {

		return (
			<Menu
				anchorEl={this.state.addComplexLocationPopover && this.state.addComplexLocationPopover.anchor}
				open={Boolean(this.state.addComplexLocationPopover)}
				onClose={this.handleCloseAddComplexLocationPopover}
			>
				{
					this.state.addComplexLocationPopover && 
						this.availableComplexLocationsLeft(this.state.addComplexLocationPopover.gId, this.state.addComplexLocationPopover.pId).map(locId => (
							<MenuItem 
								key={locId}
								onClick={this.handleAddComplexLocation}
								data-group-id={this.state.addComplexLocationPopover.gId}
								data-id={this.state.addComplexLocationPopover.pId}
								data-location-id={locId}
							>
								{BusinessLocationsService.getNameById(locId)}
							</MenuItem>
						))
				}
			</Menu>
		);
	}

	/**
	 * The sWitch to enable/disable the simple mode and the select of the location
	 */
	protected getSimpleModeSwitcher() {
		return (
			<Box display='flex' alignItems='center'>
				<Box mr={2}>
					Modalita semplice: 
					<Switch
						checked={Boolean(this.state.simpleMode)}
						onChange={this.handleToggleSimpleMode}
					/>
				</Box>

				<Box>
					{this.state.simpleMode && (
						<FieldsFactory.SelectField
							values={this.docPosVals}
							label={"Posizione"}
							margin={'dense'}
							onChange={this.handleSimpleLocationIdChange}
							value={this.state.simpleMode.locationId}
						/>
					)}
				</Box>
			</Box>
		);
	}

	/**
	 * Returns the head for the products list
	 */
	protected getTableHead(): TableHead {

		const headers = [ 
			'Nome', 
		];

		// delete
		if (this.props.editable !== false) {
			headers.unshift("");
		}

		if (AuthService.isAttributePresent(Attribute.viewSuppliers)) {
			headers.push("Fornitore");
		}
		
		if (AuthService.isAttributePresent(Attribute.viewProductBuyPrice)) {
			headers.push("€ Acquisto");
		}

		if (AuthService.isAttributePresent(Attribute.viewProductSellPrice)) {
			headers.push("€ Vendita");
		}		

		headers.push(...this.getAmountControlTableHeadThs());

		return headers;
	}


	protected getAmountControlTableHeadThs(): string[] {
		// if in simple mode then add two cells for the quantities
		if (this.state.simpleMode) {
			return 	[
				this.allLocations.length === 1 ? "Q.ta disponibile" : "Q.ta' in " + BusinessLocationsService.getNameById(this.state.simpleMode.locationId),
				"Q.ta'"
			];
		} 
		// if in complex then add a single cell
		else {
			return [
				"Posizione, Q.ta'"
			];
		}
	}


	/**
	 * Returns the body for the products list
	 */
	protected getTableBody(): TableBody {
		const bodyRows: TableBody = [];
		
		for (const gId in this.state.products) {
			for (const pId in this.state.products[gId]) {

				const stateProdData = this.state.products[gId][pId];
				const fetchedProd = stateProdData.item; 

				
				// add each prod to the arr
				const tds: TableInput[] = [
					// name
					(fetchedProd._deleted ? "RIMANENZA: " : "") + ProductsJsxRender.formatFullProductName(fetchedProd)
					
				];

				// delete btn
				if (this.props.editable !== false) {
					tds.unshift({
						props: {className: "w-1"},
						jsxEl: (<IconButton onClick={this.handleRemoveProduct} data-group-id={gId} data-id={pId} size='small'><Close/></IconButton>)
					});
				}

				if (AuthService.isAttributePresent(Attribute.viewSuppliers)) {
					tds.push(fetchedProd.variationData.supplier ? fetchedProd.variationData.supplier.fetched.name : "");
				}

				if (AuthService.isAttributePresent(Attribute.viewProductBuyPrice)) {
					tds.push('€' + DataFormatterService.centsToScreenPrice(fetchedProd.variationData.buyPrice));
				}

				if (AuthService.isAttributePresent(Attribute.viewProductSellPrice)) {
					tds.push('€' + DataFormatterService.centsToScreenPrice(fetchedProd.variationData.sellPrice));
				}

				tds.push(...this.getAmountControlTableBodyTds(gId, pId, this.props.editable));

				// add the row
				bodyRows.push({props: {id: (this.props.multiListPrefixKey || "") + 'row_' + fetchedProd._id}, tds});
			}
		}

		return bodyRows;
	}
	

	protected getAmountControlTableBodyTds(gId: string, pId: string, editable: boolean = true): TableInput[] {

		const stateProdData = this.state.products[gId][pId];
		const fetchedProd = stateProdData.item; 

		// in simple mode 
		// show the qt column and 
		// the amount field
		if (this.state.simpleMode) {
			const currentValue = stateProdData.amounts[this.state.simpleMode.locationId].amount;
			// add simple qt controls before the delete button
			return [
				fetchedProd._amountData[this.state.simpleMode.locationId] || 0,

				!editable
					? currentValue 
					: (
						<FieldsFactory.NumberField
							label={""}
							value={currentValue}
							error={currentValue < 0}

							onChange={this.handleAmountChange}
							data-group-id={gId}
							data-id={pId}
							data-location-id={this.state.simpleMode.locationId}
							
							className={"price-field"}
							margin={'none'}
						/>
					)
			];

		} 
		// in complex mode
		else {

			const locsIdsUsed = Object.keys(stateProdData.amounts).sort();

			const selectValues: SelectFieldValue[] = [];
			for (const l of this.allLocations) {
				if (locsIdsUsed.includes(l._id)) {
					continue;
				}
				selectValues.push({
					label: l.name + ' (' + (fetchedProd._amountData[l._id] || 0) + ')',
					value: l._id, 
				});
			}

			return[(
				<>
					<table className='complex-amount-picker-product-table'>
						<tbody>
							{locsIdsUsed.map(locId => (
								<tr key={locId}>

									<td>
										{editable && locsIdsUsed.length !== 1 && (
											<IconButton size='small' onClick={this.handleRemoveComplexLocation} data-group-id={gId} data-id={pId} data-location-id={locId}>
												<Delete/>
											</IconButton>
										)}
									</td>

									<td>
										{!editable
											? (
												<div className='no-wrap'>
													{BusinessLocationsService.getNameById(locId) + ' (' + (fetchedProd._amountData[locId] || 0) + ')'}
												</div>
											)
											: (
													<FieldsFactory.SelectField
														values={[{
																label: BusinessLocationsService.getNameById(locId) + ' (' + (fetchedProd._amountData[locId] || 0) + ')',
																value: locId,
															}, ...selectValues]}
														label={""}
														labelWidth={0}
														value={locId}
														variant='outlined'

														onChange={this.handleChangeComplexLocation}
														MenuProps={{
															['data-group-id' as any]: gId,
															['data-id' as any]: pId,
															['data-location-id' as any]: locId,
														}}
														margin={'dense'}
													/>
												)
										}
									</td>

									<td>
											{!editable 
												? stateProdData.amounts[locId].amount
												: (
													<FieldsFactory.NumberField
														label={""}
														value={stateProdData.amounts[locId].amount}
														error={stateProdData.amounts[locId].amount < 0}
	
														onChange={this.handleAmountChange}
														data-group-id={gId}
														data-id={pId}
														data-location-id={locId}
	
														className={"flash-bg price-field"}
														margin={"dense"}
													/>
												)
											}
									</td>
								</tr>
							))}
						</tbody>
					</table>
					{editable && this.allLocations.length !== locsIdsUsed.length && (
						<div>
							<Button color='primary' size='small' onClick={this.handleOpenAddComplexLocationPopover} data-group-id={gId} data-id={pId}>+&nbsp;Posizione</Button>
						</div>
					)}

				</>
			)];
		}
	}


}

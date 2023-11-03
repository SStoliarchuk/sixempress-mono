import React from 'react';
import { AbstractBasicDt, ICustomDtSettings, ComponentCommunicationService, BusinessLocationsService, DataFormatterService, DtFiltersSetting, ObjectUtils, ABDTProps, ICustomDtButtons, FieldsFactory,  ArgumentTypes, ABDTAdditionalSettings, ModalService } from '@sixempress/main-fe-lib';
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { ProductGroup } from "../ProductGroup";
import { Product, getProducttypeSelectValues } from '../Product';
import { ProductGroupController } from '../product-group.controller';
import { Omit } from '@material-ui/core';
import { DBUpdateEmitterDt } from '@sixempress/main-fe-lib';
import { ProductController } from '../product.controller';
import Image from "@material-ui/icons/Image";
import Button from "@material-ui/core/Button";
import { ProductsJsxRender } from '../products-render';
import { SupplierController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/suppliers/supplier.controller';

interface PTProps extends Omit<ABDTProps<ProductGroup>, 'isEmbedded'> {
	isEmbedded: ABDTProps<ProductGroup>['isEmbedded'] | 'customselect';
}

export class ProductsTable extends AbstractBasicDt<ProductGroup> implements DBUpdateEmitterDt<ProductGroup> {

	controller = new ProductGroupController();

	getFilterForSocketUpdate(data: ProductGroup[], updateIds: string[]) {
		const gIds: string[] = [];
		for (const i of updateIds) {
			const idx = this.findRowIndexBySocketUpdate(data, i);
			if (idx !== -1) { gIds.push(data[idx]._id); }
		}
		
		return {['_trackableGroupId' as keyof ProductGroup]: gIds};
	}

	public findRowIndexBySocketUpdate(d: ProductGroup[], updatedID: string) {
		for (let i = 0; i < d.length; i++) {
			if (d[i]._id === updatedID || d[i].models.find(m => m._id === updatedID)) {
				return i;
			}
		}

		return -1; 
	}

	protected controllerUrl = BePaths.products;
	protected modelClass = ModelClass.Product;
	
	protected deleteUrl = BePaths.products;


	componentDidMount() {
		super.componentDidMount();
		const showNegativeAmount = ComponentCommunicationService.getData('products-table');
		if (showNegativeAmount) {
			this.setState({dtFiltersComponentValue: {
				'_approximateTotalAmount': {$lt: 0}
			}});
		}
	}

	constructor(props) {
		super(props);
		if (props.locationFilter)
			this.additionalSettings.getParams = {locationFilter: props.locationFilter};
	}

	filterSettings: DtFiltersSetting<any> = {
		selectFields: [ {
		// 	modelPath: 'variationData.models.sellPrice',
		// 	label: 'Prezzo di Vendita',
		// 	availableValues: [{
		// 		label: 'Giacenza positiva',
		// 		value: {$gt: 0}
		// 	}, {
		// 		label: 'Giacenza negativa',
		// 		value: {$lt: 0}
		// 	}, {
		// 		label: 'Giacenza 0',
		// 		value: {$eq: 0}
		// 	}, {
		// 		label: 'Giacenza < 5',
		// 		value: {$lt: 5}
		// 	}, {
		// 		label: 'Giacenza < 10',
		// 		value: {$lt: 10}
		// 	}]
		// }, {
			modelPath: '_approximateTotalAmount',
			label: 'Giacenza',
			availableValues: [{
				label: 'Giacenza positiva',
				value: {$gt: 0}
			}, {
				label: 'Giacenza negativa',
				value: {$lt: 0}
			}, {
				label: 'Giacenza 0',
				value: {$eq: 0}
			}, {
				label: 'Giacenza < 5',
				value: {$lt: 5}
			}, {
				label: 'Giacenza < 10',
				value: {$lt: 10}
			}]
		}, {
			label: 'Tipologia',
			modelPath: 'groupData.type',
			availableValues: getProducttypeSelectValues(),
			multiple: true,
		}],
		amtsFields: [{
			textFieldProps: { label: "Fornitore", },
			modelPath: 'variationData.supplier',
			renderValue: SupplierController.formatName,
			amtsInput: {
				bePath: BePaths.suppliers,
				infoConf: {
					columns: [{
						title: 'Cod',
						data: '_progCode',
					}, {
						title: 'Nome',
						data: 'name',
					}]
				},
			},
		}, {
			textFieldProps: { label: "Categoria specifica", },
			modelPath: 'groupData.category',
			renderValue: (v) => v && v.name,
			amtsInput: {
				bePath: BePaths.inventorycategories,
				infoConf: {
					columns: [{
						title: 'Nome',
						data: 'name',
					}]
				},
			},
		}, {
			textFieldProps: { label: "Gruppo categoria", helperText: "Esclude categoria specifica", },
			modelPath: 'groupData.category.fetched._parentsTree',
			useOnlyModelPath: true,
			renderValue: (v) => v && v.name,
			amtsInput: {
				bePath: BePaths.inventorycategories,
				infoConf: {
					columns: [{
						title: 'Nome',
						data: 'name',
					}]
				},
			},
		}]
	};

	additionalSettings: ABDTAdditionalSettings<ProductGroup> = {
		projection: {
			'_trackableGroupId': 1,
			'_totalAmount': 1,
			// fields to get the stock info
			'models._reservedData': 1,
			'models._incomingData': 1,
			'models._amountData': 1,
			'models._returnedData': 1,
			'groupData.uniqueTags': 1,
			'groupData.internalTags': 1,
		},
		searchFields: [{data: 'groupData.internalTags'}, {data: 'groupData.uniqueTags'}, {data: 'groupData.tags'}],
	}


	private selected: {[gId: string]: {[pId: string]: Product}} = {};

	private handleSelectGroup(r: ProductGroup) {
		if (this.selected[r._trackableGroupId] && Object.keys(this.selected[r._trackableGroupId]).length === r.models.length) {
			delete this.selected[r._trackableGroupId];
		} 
		else {
			this.selected[r._trackableGroupId] = ObjectUtils.arrayToHashmap(r.models, '_id');
		}

		this.dtTable.current.forceUpdate();
	}
	
	private handleSelectSingle(p: Product) {
		if (!this.selected[p._trackableGroupId]) {
			this.selected[p._trackableGroupId] = {}
		}

		if (this.selected[p._trackableGroupId][p._id]) {
			delete this.selected[p._trackableGroupId][p._id];
		} else {
			this.selected[p._trackableGroupId][p._id] = p;
		}
	
		if (Object.keys(this.selected[p._trackableGroupId]).length === 0) {
			delete this.selected[p._trackableGroupId];
		}
	
		this.dtTable.current.forceUpdate();
	}

	/**
	 * as we could have filters on the table that removes some productGroup.models ids
	 * here we refetch the whole models array as to be sure all the items are added to the destination table :]
	 */
	private openProdTable(t: ArgumentTypes<(typeof ProductController)['openProductsTableOperation']>[0], dt?: ProductGroup[] | ProductGroup) {
		if (Array.isArray(dt))
			dt = dt[0];

		if (dt) {
			// ProductController.openProductsTableOperation(t, dt.models);
			new ProductGroupController().getSingle(dt._id).then(r => {
				ProductController.openProductsTableOperation(t, r.models as Array<{_id: string}>);
			});
		} 
		else {
			ProductController.openProductsTableOperation(t, []);
		}
	}

	getDtOptions(): any {

		const toR: ICustomDtSettings<ProductGroup> = {
			initialSort: {column: 1, dir: 'asc'},
			buttons: [
				{
					title: 'Crea',
					attributes: { required: [Attribute.addProducts] },
					onClick: () => this.openEditor()
				},
				{
					title: 'Modifica',
					attributes: { required: [Attribute.modifyProducts] },
					select: { type: "single", },
					onClick: (event, dt) => this.openEditor(dt),
				},
				{
					title: 'Barcode',
					onClick: (e, dt) => {
						this.openProdTable('printbarcode', dt);
					},
				},
				{
					title: 'Elimina',
					attributes: { required: [Attribute.deleteProducts] },
					select: { type: "single", },
					hideDisabled: true,
					props: {color: 'secondary'},
					onClick: (e, dt) => this.sendDeleteRequest(dt),
				},
			],
			columns: [
				{
					title: 'Foto',
					data: 'models.infoData.images',
					className: 'w-1 text-center',
					search: false,
					orderable: false,
					render: (i, m) => {
						const firstImageModel = m.models.find(i => i.infoData && i.infoData.images);
						const image = firstImageModel && firstImageModel.infoData.images[0];
						return (
							<div className='prod-table-img-thumb'>
								{image
									? <img src={image.url} alt={image.name}/> 
									: <div><Image/></div>
								}
							</div>
						);
					},
				},
				{
					title: 'Nome',
					data: 'groupData.name',
					render: (m, pg) => ProductsJsxRender.formatFullProductName(pg),
				},
				{
					title: 'Variazione/i',
					data: 'models._id',
					search: false,
					orderable: false,
					render: (data, model) => {
						if (model.models.length === 1) {
							return "Unica";
						}
						else {
							return model.models.length + ' Variazioni';
						}
					}
				},
				{
					title: 'Categoria',
					data: 'groupData.category.fetched.name',
					attributes: {required: [Attribute.viewInventoryCategories]},
				},
				{
					title: 'Quantita\' TOT',
					data: '_approximateTotalAmount',
					search: false,
					render: (d, model) => {

						const onClick = async (e: React.MouseEvent<any>) => {
							e.preventDefault();
							e.stopPropagation();

							const retrieved = await this.controller.getSingle(model._id);
							// create object to pass to generate the full stock info of the product
							const keys: Array<keyof Pick<Product, '_amountData' | '_reservedData' | '_returnedData' | '_incomingData'>> = ['_amountData', '_reservedData', '_returnedData', '_incomingData'];
							const ams: Pick<Product, '_amountData' | '_reservedData' | '_returnedData' | '_incomingData'> = {};
							
							for (const m of retrieved.models) {
								for (const k of keys) {
									// key not present in model
									if (!m[k])
										continue;
										
									if (!ams[k])
										ams[k] = {};
								
									// sum data
									for (const id in m[k]) {
										if (!ams[k][id])
											ams[k][id] = 0;
										
										ams[k][id] += m[k][id];
									}

								}
							}

							ModalService.open({title: 'Giacenza ' + model.groupData.name, content: ProductsJsxRender.generateFullAmountInfo(ams)})
						}
						return <><Button onClick={onClick} color='primary'>Controlla</Button> ca: {d}</>;
					},
				},
				{
					title: 'Fornitore',
					data: 'variationData.supplier.fetched.name',
					attributes: {required: [Attribute.viewSuppliers]},
				},
				{
					title: 'Prezzo d\'acquisto',
					data: 'variationData.buyPrice',
					attributes: {required: [Attribute.viewProductBuyPrice]},
					render: (data) => data ? '€ ' + DataFormatterService.centsToScreenPrice(data) : '',
					search: false,
				},
				{
					title: 'Prezzo di vendita',
					data: 'variationData.sellPrice',
					attributes: {required: [Attribute.viewProductSellPrice]},
					render: (data) => data ? '€ ' + DataFormatterService.centsToScreenPrice(data) : '',
					search: false,
				},
				{
					title: '',
					data: 'variationData.variants.value',
					visible: false,
				},
				{
					title: 'Barcode',
					data: 'infoData.barcode',
					visible: false,
					render: (d: string[]) => d && d.join(', '),
				},
			],
			renderDetails: (item) => {
				const params = this.generateArgsToUse(this.dtTable.current.getCurrentDtPageInfo());
				return new ProductGroupController().renderFullObjectDetails(item._id, {params});
			},
		};

		const loadBtn: ICustomDtButtons<ProductGroup> = {
			title: 'CARICA',
			attributes: { required: [Attribute.addInternalOrder] },
			onClick: (e, dt) => {
				this.openProdTable('loadproducts', dt);
			},
		};
		const manualQtBtn: ICustomDtButtons<ProductGroup> = {
			title: 'CORREGGI',
			attributes: { required: [Attribute.modifyProductMovements] },
			onClick: (e, dt) => {
				this.openProdTable('manualqt', dt);
			},
		};
		
		// if one location add the move buttons simply
		if (BusinessLocationsService.getLocationsFilteredByUser(false).length === 1) {
			// add before the delete button
			toR.buttons.splice(toR.buttons.length - 2, 0, loadBtn, manualQtBtn);
		}
		// if more then one location then add into a collection for more clean look
		else {
			toR.buttons.splice(toR.buttons.length - 2, 0, {
				attributes: { required: [Attribute.addTransferOrder] },
				title: 'Quantita\'',
				type: {
					name: "menuSingle",
					items: [
						loadBtn as any,
						manualQtBtn as any,
						{
							title: "SPOSTA",
							onClick: (e, dt) => {
								this.openProdTable('move', dt);
							}
						}
					],
				}
			});
		}

		// if (ContextService.moreLg()) {
		// 	toR.buttons.splice(0, 1, {
		// 		title: 'Crea',
		// 		attributes: { required: [Attribute.addProducts] },
		// 		type: {
		// 			name: 'menu',
		// 			items: [{
		// 				title: "Modello Singolo",
		// 				onClick: () => this.openEditor(),
		// 			}, {
		// 				title: "Modello Multiplo",
		// 				onClick: () => this.relativeNavigation('/table-editor/'),
		// 			}],
		// 		}
		// 	});
		// }


		// select detailed mode
		if (this.props && (this.props as PTProps).isEmbedded === 'customselect') {

			toR.select = {
				isSelected: (r) => Boolean(this.selected[r._trackableGroupId]),
				visualCell: (r) => (
					<FieldsFactory.Checkbox
						size='small'
						checked={Boolean(this.selected[r._trackableGroupId])}
						indeterminate={this.selected[r._trackableGroupId] && Object.keys(this.selected[r._trackableGroupId]).length !== r.models.length}
					/>
				),
				onSelect: (e, r) => this.handleSelectGroup(r),
			};
			toR.removeSelectVisualColumn = false;
			
			toR.buttons = [{
				title: 'Conferma',
				enabled: () => Object.keys(this.selected).length !== 0,
				onClick: (e, dt) => {
					const allProds: Product[] = [];
					for (const p of Object.values(this.selected)) { 
						allProds.push(...Object.values(p)); 
					}

					if (this.props.modalRef) { this.props.modalRef.close(); }
					(this.props as PTProps).emeddedData.onSelectConfirm(allProds.map(p => p._id), allProds);
				}
			}];


			toR.renderDetails = (item) => {
				const params = this.generateArgsToUse(this.dtTable.current.getCurrentDtPageInfo());

				return new ProductGroupController()
					.renderFullObjectDetailsSelectMode(item._id, {
						params: params,
						isSelected: (p) => Boolean(this.selected[p._trackableGroupId] && this.selected[p._trackableGroupId][p._id]), 
						onSelect: (p) => this.handleSelectSingle(p)
					});
			}
		}

		return toR;
	}


}


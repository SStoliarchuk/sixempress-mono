import './sale-desk.css';
import React, { useState } from 'react';
import Popover from '@material-ui/core/Popover';
import Add from '@material-ui/icons/Add';
import Info from '@material-ui/icons/InfoOutlined';
import Remove from '@material-ui/icons/Remove';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Button from '@material-ui/core/Button';
import Search from '@material-ui/icons/ImageSearch';
import IconButton from '@material-ui/core/IconButton';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Divider from '@material-ui/core/Divider';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import { SaleDeskLogic } from './sale-desk.logic';
import { BusinessLocationsService, DataFormatterService, DataStorageService, FieldsFactory, ModalComponentProps, ModalService } from '@sixempress/main-fe-lib';
import { ProductsJsxRender } from '../../products/products-render';
import CircularProgress from '@material-ui/core/CircularProgress';
import { ProductGroupController } from '../../products/product-group.controller';
import { Product } from '../../products/Product';
import { ProductController } from '../../products/product.controller';
import InfiniteScroll from 'react-infinite-scroll-component';
import { SaleDeskTab } from './sale-desk-tab';
import { SDTState } from './sale-desk.dtd';
import { ErrorCodes, MultiPCKeys } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/various';
import { PricedRowsSaleModel } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows-sale/priced-rows-sale.dtd';
import { CustomerReturn, CustomerReturnItemStatus, CustomerReturnItemStatusLabel, CustomerReturnStatus } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/returns/customer-returns/CustomerReturn';
import to from 'await-to-js';
import Table from '@material-ui/core/Table';
import TableHead from '@material-ui/core/TableHead';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import TableBody from '@material-ui/core/TableBody';
import { Sale } from '../Sale';
import { CustomerReturnController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/returns/customer-returns/customer-return.controller';
import { CouponController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/coupons/Coupon.controller';
import { Coupon } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/coupons/Coupon';

export class SaleDesk extends SaleDeskLogic {

	private handlers = {
		onChangeProductsListPhotos: () => {
			const val = !this.state.listPhotos;
			DataStorageService.set(MultiPCKeys.saleProductListPhotos, val, 'localStorage');
			this.setState({listPhotos: val});
		},
		onChangeProductSearch: (e: React.ChangeEvent<any>) => {
			const val = e.currentTarget.value;
			this.setState({searchValue: val});
			this.searchProduct(val);
		},
		onClickProductPop: (e: React.MouseEvent<any>) => {
			// TODO fetch the product here with allVariations = true for returns ? 
			const gid = e.currentTarget.dataset.gid;
			const pg = this.state.productsList.find(p => p._trackableGroupId === gid);

			// collapse the saleable variation
			const collapsedModels = this.collapseSaleableProducts(pg);

			// add directly as only 1 variant is present
			if (collapsedModels.length === 1)
				return this.addProductToTab(collapsedModels[0]);

			// open variation popup
			const el = e.currentTarget;
			this.setState({choseVariantMenu: {open: true, anchorEl: el, models: collapsedModels}});
		},
		onClickProductPopVariation: (e: React.MouseEvent<any>) => {
			const gid = e.currentTarget.dataset.gid;
			const id = e.currentTarget.dataset.id;
			
			const pg = this.state.productsList.find(p => p._trackableGroupId === gid);
			const p = pg.models.find(p => p._id === id);

			this.addProductToTab(p);
		},
		onClickCloseVariationPopover: () => {
			this.setState({choseVariantMenu: {...this.state.choseVariantMenu, open: false}});
		},
		onClickChangeSaleTab: (e: React.MouseEvent<any>) => {
			const idx = e.currentTarget.dataset.idx;
			this.changeTab(idx);
		},
		onClickOpenDetails: (e: React.MouseEvent<any>) => {
			e.stopPropagation();
			const gid = e.currentTarget.dataset.gid;
			new ProductGroupController().openFullDetailModal(gid);
		},
		onClickProductDetails: (id: string) => {
			const receiptProd = this.activeTab.products?.find(p => p.item.id === id);
			if (!receiptProd)
				return;

			// base item to use in case we reach 0 and the item is no longer in sale
			const prod = receiptProd.item.fetched;
			const _this = this;

			ModalService.open({title: 'Dettagli Prodotto', content: function ProducDetails() {
				const [s, u] = useState(false);
				const forceUpdate = () => u(!s);

				// this can be undefined when we remove the product from the list
				// but we do not return null as we want the user to be able to reach 0 and back up
				const inSale = _this.activeTab.products?.find(p => p.item.id === id)

				const amountLeft = _this.adjustProductAmount(inSale ? inSale.item.fetched : prod, _this.activeTab.physicalLocation, _this.activeTab.products).__amountLeft;
				const amountInSale = inSale ? inSale.amount : 0;

				const updateStock = (positive: boolean) => {
					_this.addProductToTab(prod, positive ? 1 : -1);
					forceUpdate();
				};

				return (
					<>
						<div className='change-amount-var'>
							<Button disabled={amountInSale < 1} color='secondary' onClick={() => updateStock(false)}><Remove/></Button>
							<div className='text-center'>
								<span>{amountInSale}</span>
							</div>
							<Button disabled={amountLeft < 1} color='primary' onClick={() => updateStock(true)}><Add/></Button>
						</div>
						<ProductController.FullDetailJsx id={id}/>
					</>
				);
			}});
		},
		onProductsSelectedChange: (p: Product[], tab: SDTState) => {
			this.adjustProductAmounts(tab, p);
		},
		onCreateConfirm: (tab: SDTState, total: number) => {
			this.createCurrentTab(tab, total);
		},
		onChangePhysicalLocation: (oldId: string, newId: string) => {
			if (oldId !== newId)
				this.readjustAmountForTab();
		},
	};
	

	protected processIfReturnTab(base: Omit<PricedRowsSaleModel<any>, 'status'>, tab: SDTState) {
		return new Promise<void>((r, j) => {
			const _this = this;
	
			ModalService.open({title: 'Creazione Reso', content: function CustomerReturnSaleCreateModal(props: ModalComponentProps) {
				const [itSt, setItSt] = useState(CustomerReturnItemStatus.itemsWorking);
				const [handleMoneyMode, setHandleMoneyMode] = useState<'addSale' | 'refund' | 'coupon'>('addSale');
				const [isSent, setIsSent] = useState(false);

				const send = () => {
					setIsSent(true);

					const status = handleMoneyMode === 'refund' ? CustomerReturnStatus.refunded : CustomerReturnStatus.generatedCoupon;
					const ret: CustomerReturn = { ...base, status: status, itemStatus: itSt };
					
					// remove payments
					if (status !== CustomerReturnStatus.refunded)
						ret.payments = [];

					_this.safeSend(new CustomerReturnController(), ret)
					.then(async (saved) => {
						props.modalRef.close();
	
						await _this.changeTab(0);
						if (handleMoneyMode !== 'refund') {
							new CouponController().getMulti({params: {filter: {'_generatedFrom.id': saved._id}}}).then((res) => {
								if (handleMoneyMode === 'addSale') {
									for (const c of res.data)
										_this.tabRef.current.addCouponToTab(c);
								}
								else if (handleMoneyMode === 'coupon') {
									const modal = ModalService.open({
										title: 'Buono Cassa',
										content: (
											<>
												Codice Buono Da utilizzare in cassa: <br/>
												<ul>
													{res.data.map(d => <li>{d.code}</li>)}
												</ul>
											</>
										),
										actions: (
											<Button color='primary' onClick={() => modal.close()}>Chiudi</Button>
										)
									});
								}
							})

						}

						r();
					})
					.catch(e => j(e));
				}
	
				return (
					<>
						<ButtonGroup fullWidth>
							<Button
								fullWidth
								color='primary' 
								variant={itSt === CustomerReturnItemStatus.itemsWorking ? 'contained' : 'outlined'} 
								onClick={() => setItSt(CustomerReturnItemStatus.itemsWorking)}
							>
								{CustomerReturnItemStatusLabel[CustomerReturnItemStatus.itemsWorking]}
							</Button>
							<Button 
								fullWidth
								color='secondary' 
								variant={itSt === CustomerReturnItemStatus.itemsDamaged ? 'contained' : 'outlined'} 
								onClick={() => setItSt(CustomerReturnItemStatus.itemsDamaged)}
							>
								{CustomerReturnItemStatusLabel[CustomerReturnItemStatus.itemsDamaged]}
							</Button>
						</ButtonGroup>
						
						<Box mt={2} mb={1}>
							<Divider variant='middle'/>
						</Box>
	
						{_this.viewCoupon && (
							<FieldsFactory.Radio
								label='Aggiungi buono cassa alla vendita'
								checked={handleMoneyMode === 'addSale'}
								onChange={() => setHandleMoneyMode('addSale')}
							/>
						)}
						<br/>
						<FieldsFactory.Radio
							label='Restituzione costo al cliente'
							checked={handleMoneyMode === 'refund'}
							onChange={() => setHandleMoneyMode('refund')}
						/>
						<br/>
						{_this.viewCoupon && (
							<FieldsFactory.Radio
								label='Crea buono cassa'
								checked={handleMoneyMode === 'coupon'}
								onChange={() => setHandleMoneyMode('coupon')}
							/>
						)}
						<Box display='flex' flexDirection='row-reverse' mt={4}>
							<Button onClick={send} color='primary' disabled={isSent}>Conferma</Button>
						</Box>
					</>
				);
			}})
		});

	}

	// show modal error for stock unavailable
	protected async processIfSaleTab(base: Omit<PricedRowsSaleModel<any>, 'status'>, tab: SDTState): Promise<Sale> {
		const [error, d] = await to<Sale, any>(super.processIfSaleTab(base, tab));
		if (!error)
			return d;

		// throw the error if it is not a stock a error
		const err = error && error.data;
		if (!err)
			throw error;

		if (err.code === ErrorCodes.productStockInsufficientPricedRows) {
			const data: Array<{id: string, subracted: number, available: number, locationId: string}> = err.data;
	
			const modal = ModalService.open({
				title: 'Errore Giacenza',
				content: (
					<>
						Si sta tentando di vendere prodotti non disponibili
						<br/>
						<br/>
						<Table size='small' stickyHeader>
							<TableHead>
								<TableCell>Prodotto</TableCell>
								<TableCell>Da vendere</TableCell>
								<TableCell>Disponbilita'</TableCell>
								<TableCell>Posizione</TableCell>
							</TableHead>
							<TableBody>
								{data.map(p => (
									<TableRow key={p.id}>
										<TableCell>{ProductsJsxRender.formatFullProductName(this.activeTab.products.find(sp => sp.item.id === p.id).item.fetched)}</TableCell>
										<TableCell>{p.subracted}</TableCell>
										<TableCell>{p.available}</TableCell>
										<TableCell>{BusinessLocationsService.getNameById(p.locationId)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</>
				),
				actions: (
					<Button color='primary' onClick={() => modal.close()}>Chiudi</Button>
				)
			});
		}
		else if (err.code === ErrorCodes.couponAlreadyUsed) {
			const data: Coupon[] = err.data;

			const modal = ModalService.open({
				title: 'Coupon Utilizzato',
				content: (
					<>
						I seguenti coupon sono gia' stati utilizzati: <br/>
						<ul>
							{data.map(d => <li>{d.code}</li>)}
						</ul>
					</>
				),
				actions: (
					<Button color='primary' onClick={() => modal.close()}>Chiudi</Button>
				)
			});
		}
		else {
			throw error;
		}
	}

	render() {
		return (
			<>
				<Popover
					open={Boolean(this.state.choseVariantMenu.open)}
					anchorEl={this.state.choseVariantMenu.anchorEl}
					onClose={this.handlers.onClickCloseVariationPopover}
					anchorOrigin={{vertical: 'top', horizontal: 'center'}}
					transformOrigin={{vertical: 'top', horizontal: 'center'}}
				>
					<div className={'variation-popover-list-container sale-tab-type ' + (this.isTabReturns() ? 'sale-tab-type-returns' : '')}>
						{this.state.choseVariantMenu.models && this.state.choseVariantMenu.models.map(p => (
							<div key={p._id} onClick={this.handlers.onClickProductPopVariation} data-gid={p._trackableGroupId} data-id={p._id} className={p.__amountLeft > 0 ? '' : 'pop-no-stock'}>
								<Button color='primary'><Add/></Button>
								<div>
									{ProductsJsxRender.formatProductVariantName(p)}<br/>
									€&nbsp;{DataFormatterService.centsToScreenPrice(p.variationData.sellPrice)}
								</div>
							</div>
						))}
					</div>
				</Popover>

				<div className={'sale-desk-root sale-tab-type ' + (this.isTabReturns() ? 'sale-tab-type-returns' : '')}>
					<div>
						<Box mb={2} className='tabs-container'>
							<Tabs value={0} indicatorColor='primary' variant='scrollable' textColor='primary' >
								<Tab label={'Prodotti'}/>
								{/* <Tab label={'Abito'}/>
								<Tab label={'Maglioni'}/>
								<Tab label={'Shorts'}/>
								<Tab label={'Jeans'}/> */}
							</Tabs>
						</Box>

						<div>
							<Paper className='sale-product-list-top def-box mb-0 square-bottom paper-accent'>
								<div>
									<FieldsFactory.TextField placeholder='Cerca Prodotto' value={this.state.searchValue} margin='none' onChange={this.handlers.onChangeProductSearch}/>
								</div>
								<div>
									<FieldsFactory.Switch label='Immagini' checked={this.state.listPhotos} onChange={this.handlers.onChangeProductsListPhotos} size='small'/>
								</div>
							</Paper>
							<Paper className='def-box mt-0 bt-0 square-top'>
								{this.state.productsListLoading
								? (
									<div className='sale-desk-quick-pops sale-desk-quick-pops-empty'>
										<CircularProgress/>
									</div>
								)
								: this.state.productsList.length 
								? (
									<InfiniteScroll
										className='sale-desk-quick-pops sale-desk-quick-pops-container'
										dataLength={this.state.productsList.length}
										next={this.onInfiniteScroll}
										ref={this.infiniteScrollRef}
										hasMore={this.state.productsListHasMore}
										loader={<div className='sale-desk-infinite-loader-container'><CircularProgress/></div>}
										height={600}
										scrollThreshold={0.95}
									>
										{this.state.productsList.map(pg => (
											<div key={pg._id} onClick={this.handlers.onClickProductPop} data-gid={pg._id} className={pg.models.some(m => m.__amountLeft > 0) ? '' : 'pop-no-stock'}>
												<div className='pop-image-container'>
													{this.state.listPhotos && pg.models[0].infoData.images?.length 
														? <img src={pg.models[0].infoData.images[0].url} alt={pg.groupData.name}/>
														: <span>{ProductsJsxRender.formatFullProductName(pg)}</span>
													}
												</div>
												<div className='d-flex'>
													<div>
														<IconButton className='pop-info-btn' onClick={this.handlers.onClickOpenDetails} data-gid={pg._id}>
															<Info/>
														</IconButton>
													</div>
													<div>
														<div>{ProductsJsxRender.formatProductTags(pg, true)}</div>
														<div>{pg.groupData.name}</div>
														{typeof pg.variationData?.sellPrice !== 'undefined' && (
															<div>€ {DataFormatterService.centsToScreenPrice(pg.variationData.sellPrice)}</div>
														)}
													</div>
												</div>
											</div>
										))}
									</InfiniteScroll>
								) 
								: (
									<div className='sale-desk-quick-pops sale-desk-quick-pops-empty'>
										<div>
											<Search/>
											<span>
												Cerca un prodotto o
												<br/>Scansione un barcode
											</span>
										</div>
									</div>
								)}
							</Paper>
						</div>
					</div>

					<div>
						<Box mb={2}>
							<Tabs value={this.state.tabIndex} indicatorColor='primary' variant='fullWidth' textColor='primary' >
								<Tab label={'Cassa'} data-idx={0} onClick={this.handlers.onClickChangeSaleTab}/>
								{this.showCustomerReturnTab && <Tab label={'Reso'} data-idx={1} onClick={this.handlers.onClickChangeSaleTab}/>}
							</Tabs>
						</Box>

						<SaleDeskTab
							key={this.state.tabIndex}
							ref={this.tabRef}
							saleLocations={this.saleLocations}
							isReturnTab={this.isTabReturns()}
							defaultState={this.state.tabStates[this.state.tabIndex]}
							onChangePhysicalLocation={this.handlers.onChangePhysicalLocation}
							onConfirm={this.handlers.onCreateConfirm}
							onProductsChange={this.handlers.onProductsSelectedChange}
							onClickProductDetails={this.handlers.onClickProductDetails}
						/>
					
					</div>
				</div>
			</>
		);
	}
	
}

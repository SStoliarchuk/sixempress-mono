import React from 'react';
import './sale-desk.css';
import Collapse from '@material-ui/core/Collapse';
import Close from '@material-ui/icons/Close';
import CreditCard from '@material-ui/icons/CreditCard';
import AttachMoney from '@material-ui/icons/AttachMoney';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import Button from '@material-ui/core/Button';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import IconButton from '@material-ui/core/IconButton';
import Icon from '@material-ui/core/Icon';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import Divider from '@material-ui/core/Divider';
import Paper from '@material-ui/core/Paper';
import { AmtsFieldProps, DataFormatterService, FetchableField, FieldsFactory, SelectFieldValue } from '@sixempress/main-fe-lib';
import { ProductsJsxRender } from '../../products/products-render';
import { PricedRow } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows/priced-rows.dtd';
import { CustomerController } from '../../customers/customer.controller';
import { Customer } from '../../customers/Customer';
import { MovementMedium, MovementMediumLabel, MovementMediumMenuLabel } from '../../movements/Movement';
import { ProductController } from '../../products/product.controller';
import moment from 'moment';
import { SaleDeskTabLogic } from './sale-desk-tab.logic';
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { CouponController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/coupons/Coupon.controller';

export class SaleDeskTab extends SaleDeskTabLogic {

	/**
	 * The value inside the pay medium select that if is selected we remove the row
	 */
	private static REMOVE_PAY_ROW_VALUE_IN_SELECT = '__remove';


	/**
	 * Different medium of the payments for the sale
	 * 
	 * NOTE: we add a voice that allows us to remove the payments without adding some other button to the side which is ugly
	 */
	 private payMediumSelect: SelectFieldValue[] = [
		...Object.values(MovementMedium).filter(m => typeof m === 'number').map(m => ({
			value: m,
			label: MovementMediumMenuLabel[m],
			menuLabel: MovementMediumLabel[m],
		})),
		{
			value: SaleDeskTab.REMOVE_PAY_ROW_VALUE_IN_SELECT,
			label: (
				<>
					<Divider/>
					<div className='sale-desk-pay-medium-remove'>
						<Icon><Close/></Icon>
						<span>Rimuovi</span>
					</div>
				</>
			) as any,
		}
	];

	private customerAmtsProps: AmtsFieldProps<Customer> = (() => {
		const base = CustomerController.AmtsFieldProps();
		base.amtsInput.choseFn = (c) => this.setState({customer: c ? new FetchableField(c._id, ModelClass.Customer, c) : undefined});
		base.canClearField = true;
		return base as AmtsFieldProps<Customer>;
	})();


	protected handlers = {
		onClickRemoveProduct: (e: React.MouseEvent<any>) => {
			const id = e.currentTarget.dataset.id;
			this.removeProductFromTab(id);
		},
		onClickRemoveCoupon: (e: React.MouseEvent<any>) => {
			const id = e.currentTarget.dataset.id;
			this.setState(s => {
				const cps = [...s.coupons];
				const idx = cps.findIndex(c => c.item.id === id);
				if (idx !== -1)
					cps.splice(idx, 1);

				return {coupons: cps};
			});
		},
		onClickRemoveManual: (e: React.MouseEvent<any>) => {
			const idx = e.currentTarget.dataset.idx;
			this.setState(s => {
				const m = [...s.manual];
				m.splice(idx, 1);
				return {manual: m};
			});
		},
		onClickAddManual: () => {
			this.addManualToTab()
		},
		onClickAddCoupon: () => {
			const c = new CouponController();
			c.openSelectDt(
				'single', 
				(ids) => c.getMulti({params: {filter: {_id: {$in: ids}}}}).then(data => data.data.map(i => this.addCouponToTab(i))), 
			);
		},
		onChangeManual: (e: React.ChangeEvent<any>) => {
			const idx = e.currentTarget.parentElement.parentElement.dataset.idx;
			const field = e.currentTarget.parentElement.parentElement.dataset.field;
			const val = e.currentTarget.value;
			this.setState(s => {
				const m = [...s.manual];
				m[idx][field] = val;
				return {manual: m};
			});
		},
		onClickProductsTableSelect: () => {
			const c = new ProductController();
			c.openSelectDt(
				'detailed', 
				(ids) => c.getMulti({params: {filter: {_id: {$in: ids}, _deleted: null}}}).then(data => data.data.map(i => this.addProductToTab(i))), 
			);
		},
		onClickOverridePrice: (e: React.MouseEvent<any>) => {
			const type = e.currentTarget.dataset.type;
			if (this.state.ovverridePrice?.type === type)
				this.setState({ovverridePrice: undefined});
			else
				this.setState({ovverridePrice: {type, value: null}})
		},
		onClickPartialPay: () => {
			this.setState({partialPayment: !Boolean(this.state.partialPayment)});
		},
		onClickAddPayment: () => {
			this.setState({payments: [...(this.state.payments || []), {amount: undefined, date: moment().unix(), medium: MovementMedium.unspecified}]});
		},
		onClickOpenControl: () => {
			this.setState({saleControlOpen: !this.state.saleControlOpen});
		},
		onClickDetailsProduct: (e: React.ChangeEvent<any>) => {
			const id = e.currentTarget.dataset.id;
			this.props.onClickProductDetails(id, this.state);
		},
		onChangeOverrideValue: (e: React.ChangeEvent<any>) => {
			const val = e.currentTarget.value;
			this.setState({ovverridePrice: {...this.state.ovverridePrice, value: val}});
		},
		onChangePhysicalLocation: (e: React.ChangeEvent<any>) => {
			const val = e.target.value;
			const old = this.state.physicalLocation;
			this.setState({physicalLocation: val});
			this.props.onChangePhysicalLocation(old, val);
		},
		onClickMovementMedium: (e: React.MouseEvent<any>) => {
			const type = e.currentTarget.dataset.type;
			this.setState({activePayMedium: +type});
		},
		onClickRestore: () => {
			const prods = [...(this.state.products || [])].map(p => p.item.fetched);
			this.setState(this.getStartingState(), () => this.props.onProductsChange(prods, this.state));
		},
		onClickCreate: () => {
			this.createCurrentTab();
		},
		preventDefault: (e: React.KeyboardEvent<any>) => {
			e.preventDefault()
		},
		onChangePayAmount: (e: React.ChangeEvent<any>) => {
			const val = e.currentTarget.value;
			const idx = e.currentTarget.parentElement.parentElement.dataset.idx;
			
			this.setState(s => {
				const pays = [...s.payments];
				pays[idx].amount = val;
				return {payments: pays};
			})
		},
		onChangePayMedium: (e: React.ChangeEvent<any>) => {
			const val = e.target.value;
			const idx = e.currentTarget.dataset.idx;
			
			this.setState(s => {
				const pays = [...s.payments];
				
				if (val === SaleDeskTab.REMOVE_PAY_ROW_VALUE_IN_SELECT)
					pays.splice(idx, 1);
				else
					pays[idx].medium = val;

				return {payments: pays};
			})
		},
	};

	private formatReceiptProductName(p: PricedRow['products'][0]) {
		const important = ProductsJsxRender.formatProductTags(p.item.fetched, true) + ' ' + ProductsJsxRender.formatProductVariantName(p.item.fetched);

		return important === ' '
			? p.item.fetched.groupData.name
			: (<>{important}<br/>{p.item.fetched.groupData.name}</>)
	}

	render() {
		return (
			<>
				<Paper className='def-box mb-0 square-bottom paper-accent'>
					<FieldsFactory.AmtsField {...this.customerAmtsProps} textFieldProps={{
						value: this.state.customer?.fetched,
						placeholder: 'Cliente',
						variant: 'standard',
						margin: 'none',
						fullWidth: true,
					}}/>
				</Paper>

				<Paper className='def-box mb-0 bb-0 mt-0 bt-0 square-bottom square-top'>
					<div className='receipt-container'>
						<table className='receipt-table receipt-table-coupons'>
							<tbody>
								{this.state.coupons?.map((p) => (
									<tr key={p.item.id}>
										<td>{p.item.fetched.code}</td>
										<td>€ -{DataFormatterService.centsToScreenPrice(p.item.fetched.amount)}</td>
										<td><IconButton data-id={p.item.id} onClick={this.handlers.onClickRemoveCoupon} size='small'><Close/></IconButton></td>
									</tr>
								))}
							</tbody>
						</table>
						
						<table className='receipt-table receipt-table-products'>
							<tbody>
								{this.state.products?.map((p) => (
									<tr key={p.item.id}>
										<td>{p.amount}x</td>
										<td className='def-link' data-id={p.item.id} onClick={this.handlers.onClickDetailsProduct}>{this.formatReceiptProductName(p)}</td>
										<td>€ {DataFormatterService.centsToScreenPrice(p.item.fetched.variationData.sellPrice)}</td>
										<td><IconButton data-id={p.item.id} onClick={this.handlers.onClickRemoveProduct} size='small'><Close/></IconButton></td>
									</tr>
								))}
							</tbody>
						</table>

						<table className='receipt-table receipt-table-manual'>
							<tbody>
								{this.state.manual?.map((p, idx) => (
									<tr key={'' + idx + this.state.manual.length}>
										<td>
											<FieldsFactory.TextField
												label=''
												margin='none'
												placeholder='Descrizione'
												value={p.description}
												error={!this.validate('man_description', p.description)}
												data-idx={idx}
												data-field={'description'}
												onChange={this.handlers.onChangeManual}
											/>
										</td>
										<td>
											<FieldsFactory.PriceField
												label=''
												margin='none'
												placeholder='€'
												// InputProps={this.jsxCache.euroStartAddornment}
												error={!this.validate('man_price', p.sellPrice)}
												value={p.sellPrice}
												data-idx={idx}
												data-field={'sellPrice'}
												onChange={this.handlers.onChangeManual}
											/>
										</td>
										<td>
											<IconButton data-idx={idx} onClick={this.handlers.onClickRemoveManual} size='small'><Close/></IconButton>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className='text-center'>	
						<Button color='primary' onClick={this.handlers.onClickProductsTableSelect}>+Prodotti</Button>
						<Button color='primary' onClick={this.handlers.onClickAddManual}>+Manuale</Button>
						{this.viewCoupon && !this.props.isReturnTab && <Button color='primary' onClick={this.handlers.onClickAddCoupon}>+Buono</Button>}
						{/* <Button color='primary'>+Reso</Button> */}
						{/* <Button color='primary'>+Coupon</Button> */}
					</div>
				</Paper>

				<Paper className='def-box mt-0 square-top paper-accent'>
					<div className='receipt-bottom-controls-container'>
						<div onClick={this.handlers.onClickOpenControl}>
							<table>
								<tbody>
									<tr><td>Elem</td><td>:</td><td>{this.getItemsCount()}</td></tr>
									<tr><td>Costo</td><td>:</td><td>€&nbsp;{DataFormatterService.centsToBigNumber(this.getCalculatedTotal())}</td></tr>
								</tbody>
							</table>
						</div>
						<div>
							<ButtonGroup variant="outlined" color='primary' className='sale-quick-medium-btn-container'>
								<Button variant={this.state.activePayMedium === MovementMedium.cash ? 'contained' : undefined} data-type={MovementMedium.cash} onClick={this.handlers.onClickMovementMedium}>
									<AttachMoney fontSize='small'/>
								</Button>
								<Button variant={this.state.activePayMedium === MovementMedium.card ? 'contained' : undefined} data-type={MovementMedium.card} onClick={this.handlers.onClickMovementMedium}>
									<CreditCard fontSize='small'/>
								</Button>
							</ButtonGroup>
							{this.canDiscount && (
								<IconButton onClick={this.handlers.onClickOpenControl}>
									{this.state.saleControlOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
								</IconButton>
							)}
						</div>
					</div>
					{this.canDiscount && (
						<Collapse in={this.state.saleControlOpen} timeout='auto'>
							<>
								<div>
									<FieldsFactory.Radio data-type={'percentage'} checked={this.state.ovverridePrice?.type === 'percentage'} label="Sconto %" onClick={this.handlers.onClickOverridePrice}/>
									<FieldsFactory.Radio data-type={'manual'} checked={this.state.ovverridePrice?.type === 'manual'} label="Prezzo Manuale" onClick={this.handlers.onClickOverridePrice}/>
								</div>
								{this.state.ovverridePrice && (
									<div>
										{
											this.state.ovverridePrice.type === 'manual' 
											? (
												<FieldsFactory.PriceField
													margin='none'
													size='small'
													fullWidth
													variant='outlined'
													placeholder='Prezzo manuale'
													error={!this.validate('discount')}
													value={typeof this.state.ovverridePrice.value === 'undefined' ? '' : this.state.ovverridePrice.value}
													onChange={this.handlers.onChangeOverrideValue}
												/>
											)
											: (
												<div className='sale-percentage-container'>
													<FieldsFactory.NumberField
														margin='none'
														size='small'
														variant='outlined'
														fullWidth={false}
														placeholder='%'
														error={!this.validate('discount')}
														value={typeof this.state.ovverridePrice.value === 'undefined' ? '' : this.state.ovverridePrice.value}
														onChange={this.handlers.onChangeOverrideValue}
													/>
													<span>
														Tot: € {DataFormatterService.centsToScreenPrice(this.state.ovverridePrice.value ? this.getPercentageTotal() : this.getCalculatedTotal())}
													</span>
												</div>
											)}
									</div>
								)}
								<Divider className='def-mui-divider'/>
								<Grid container>
									{(this.state.payments || []).map((p, idx) => (
										<React.Fragment key={'' + idx + this.state.payments.length}>
											<Grid item xs={7}>
												<FieldsFactory.DateField
													value={p.date}
													placeholder='Data'
													pickerType='datetime'
													margin='dense'
													// variant='outlined'
													fullWidth
													error={!this.validate('pay_date', p.date)}
													onChange={m => this.setState(s => {
														const pays = [...s.payments];
														pays[idx].date = m ? m.unix() : undefined;
														return {payments: pays};
													})}
												/>
											</Grid>
											<Grid item xs={3}>
												<FieldsFactory.PriceField
													data-idx={idx}
													placeholder='Euro'
													margin='dense'
													// variant='outlined'
													value={typeof p.amount === 'undefined' ? '' : p.amount}
													error={!this.validate('pay_price', p.amount)}
													onChange={this.handlers.onChangePayAmount}
												/>
											</Grid>
											<Grid item xs={2}>
												<FieldsFactory.SelectField
													className='sale-desk-pay-medium'
													data-idx={idx}
													margin='dense'
													// variant='outlined'
													value={p.medium}
													values={this.payMediumSelect}
													onChange={this.handlers.onChangePayMedium}
												/>
											</Grid>
										</React.Fragment>
									))}
								</Grid>

								<Button color='primary' onClick={this.handlers.onClickAddPayment}>+ Pagamenti</Button>
								
								<div>
									<FieldsFactory.Checkbox
										checked={this.state.partialPayment || false}
										onClick={this.handlers.onClickPartialPay}
										label='Pagamento Incompleto'
									/>
								</div>

								<Divider className='def-mui-divider'/>

								{this.props.saleLocations.length !== 1 && (
									<div>
										<FieldsFactory.SelectField
											values={this.props.saleLocations}
											label='Posizione vendita'
											margin='dense'
											variant='outlined'
											fullWidth
											error={!this.validate('location')}
											onChange={this.handlers.onChangePhysicalLocation}
											value={this.state.physicalLocation || ''}
										/>
									</div>
								)}
							</>
						</Collapse>
					)}
					<Box mt={2} display='flex' justifyContent='space-between'>
						<Button color='primary' variant='outlined' onClick={this.handlers.onClickRestore} onKeyDown={this.handlers.preventDefault}>Ripulisci</Button>
						<Button variant='contained' disabled={!this.validate('all')} color={this.props.isReturnTab ? 'secondary' : 'primary'} onClick={this.handlers.onClickCreate} onKeyDown={this.handlers.preventDefault}>
							{this.props.isReturnTab ? 'Crea Reso' : 'Crea Vendita'}
						</Button>
					</Box>
				</Paper>
			</>
		)
	}

}
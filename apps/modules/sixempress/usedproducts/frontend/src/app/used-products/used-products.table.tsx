import { UsedProduct } from './UsedProduct';
import { AbstractBasicDt, ICustomDtSettings, DataFormatterService, DtFiltersSetting, SmallUtils, ABDTProps, ConfirmModalComponent, LibSmallUtils, } from '@sixempress/main-fe-lib';
import { openQuickUsedProductSale } from './quick-used-product-sale';
import { SaleStatus } from '@sixempress/multi-purpose';
import { UsedProductController } from './used-products.controller';
import { Attribute } from '../../enums/attributes';
import { BePaths } from '../../enums/bepaths';

export interface UPProps extends ABDTProps<UsedProduct> {
	showNotSold?: true;
}

const openReceiptModal = use_action.sxmp_openReceiptModal;

export class UsedProductsTable extends AbstractBasicDt<UsedProduct, UPProps> {

	controller = new UsedProductController();

	componentDidMount() {
		super.componentDidMount();

		if (this.props.showNotSold) {
			this.setState({dtFiltersComponentValue: {_sellTime: {$exists: false}}});
		}
		
	}


	filterSettings: DtFiltersSetting<UsedProduct> = {
		selectFields: [{
			modelPath: '_sellTime',
			label: 'Venduto',
			availableValues: [{
				label: 'Non venduto',
				value: {$exists: false}
			}, {
				label: 'Venduto',
				value: {$exists: true}
			}]
		}]
	};


	protected getDtOptions(): ICustomDtSettings<UsedProduct> {
		const toR: ICustomDtSettings<UsedProduct> = {
			buttons: [
				{
					title: 'Aggiungi',
					attributes: { required: [Attribute.addUsedProducts] },
					onClick: () => {
						this.openEditor();
					}
				},
				{
					title: 'Modifica',
					attributes: { required: [Attribute.modifyUsedProducts] },
					select: {type: 'single', enabled: (model) => !model._sellTime, },
					onClick: (event, dt) => this.openEditor(dt)
				},
				{
					title: 'Vendi prodottto',
					attributes: { required: [Attribute.modifyUsedProducts] },
					select: {type: 'single', enabled: (p) => Boolean(!p._sellTime && p.sellPrice), },
					onClick: (event, dt) => openQuickUsedProductSale(this.getRowData(dt), {onClosed: () => this.reloadTable()}),
				},
				{
					title: 'Scontrino',
					select: {type: 'single', enabled: (model) => Boolean(model._sellTime), },
					onClick: (event, dt) => {
						const model = this.getRowData(dt);
						openReceiptModal({
							forcePassedSale: true,
							sale: {
								date: model._sellTime,
								status: SaleStatus.success,
								list: [{
									manual: [{
										description: model.name + (model.additionalInfo?.imeiNumber ? '<br/> IMEI: ' + model.additionalInfo.imeiNumber : ''),
										sellPrice: model.sellPrice,
										buyPrice: model.buyPrice,
									}]
								}],
								_priceMeta: {maxTotal: model.sellPrice, net: model.sellPrice - model.buyPrice, priceChange: 0, left: 0},
								totalPrice: model.sellPrice,
								payments: [],
							}
						})
					},
				},
				{
					title: 'Annulla vendita',
					attributes: { required: [Attribute.modifyUsedProducts] },
					select: {type: 'single', enabled: (model) => Boolean(model._sellTime), },
					hideDisabled: true,
					onClick: (event, dt) => {
						ConfirmModalComponent.open('Annulla Vendita Usato', 'Sicuro di voler annullare la vendita di questo usato?', (e) => {
							if (!e)
								return;

							this.controller.patch(
								this.getRowData(dt)._id,
								[{op: 'unset', path: 'buyer', value: ''}]
							)
							.then(res => { 
								LibSmallUtils.notify('Vendita Usato Annullata', 'success'); 
								this.reloadTable();
							} );
						})
					},
					// attributes: { required: [Attribute.Worker] }
				},
			],
			columns: [
				{
					title: 'C.C',
					data: 'seller.fetched._progCode',
					search: {
						regex: false,
						toInt: true
					}
				},
				{
					title: 'Cliente',
					data: 'seller.fetched.name',
				},
				{
					title: 'Prodotto',
					data: 'name',
				},
				{
					title: 'Prezzo di acquisto',
					data: 'buyPrice',
					render: (data) => data ? '€ ' + DataFormatterService.centsToScreenPrice(data) : ''
				},
				{
					title: 'Prezzo di vendita',
					data: 'sellPrice',
					render: (data) => data ? '€ ' + DataFormatterService.centsToScreenPrice(data) : ''
				},
				{
					title: 'Acquistato',
					data: '_created._timestamp',
					render: (data) => data ? DataFormatterService.formatUnixDate(data) : '',
				},
				{
					title: 'Venduto',
					data: '_sellTime',
					render: (data) => data ? DataFormatterService.formatUnixDate(data) : '',
				},
				{
					title: 'C.C Acquirente',
					data: 'buyer.fetched._progCode',
				},
				{
					title: 'Nome Acquirente',
					data: 'buyer.fetched.name',
				},
				{
					title: 'IMEI',
					data: 'additionalInfo.imeiNumber',
				},
			],
		};


		return toR;
	}

}

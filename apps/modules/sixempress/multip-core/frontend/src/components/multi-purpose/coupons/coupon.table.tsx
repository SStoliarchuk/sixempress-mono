import { ABDTAdditionalSettings, AbstractBasicDt, DataFormatterService, DTProps, ICustomDtSettings, } from '@sixempress/main-fe-lib';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { CustomerController } from '../customers/customer.controller';
import { Coupon } from './Coupon';
import { CouponController } from './Coupon.controller';

export class CouponTable extends AbstractBasicDt<Coupon> {

	controller = new CouponController();

	additionalSettings: ABDTAdditionalSettings<Coupon> = {
		toFetch: [{field: "customer", projection: CustomerController.formatNameProjection}],
		projection: {_generatedFrom: 1},
	};

	processDtInput(): DTProps<Coupon>  {
		const s = super.processDtInput();

		if (this.isSelectMode() && s.toolbar && typeof s.toolbar === 'object') {
			const old = s.toolbar.buttons[0].enabled;
			s.toolbar.buttons[0].enabled = (r) => {
				if (typeof old === 'boolean')
					return old;
				if (!old(r))
					return false;
				if (r.some(c => c._used))
					return false;
				return true;
			}
		}

		return s;
	}

	protected getDtOptions(): ICustomDtSettings<Coupon> {
		return {
			buttons: [
				{
					title: 'Aggiungi',
					attributes: { required: [Attribute.addCoupon] },
					onClick: () => {
						this.openEditor();
					}
				},
				{
					title: 'Modifica',
					attributes: { required: [Attribute.modifyCoupon] },
					select: { type: "single", enabled: (m) => !m._used && !m._generatedFrom },
					onClick: (event, dt) => {
						this.openEditor(dt);
					}
				},
			],
			columns: [
				{
					title: 'Data',
					data: 'date',
					render: d => DataFormatterService.formatUnixDate(d),
				},
				{
					title: 'Codice',
					data: 'code'
				},
				{
					title: 'Cliente',
					data: 'customer.fetched.name',
					render: (c, row) => CustomerController.formatCustomerName(row.customer?.fetched),
					search: {manual: v => CustomerController.createCustomerNameQuery(v, 'customer.fetched')},
				},
				{
					title: 'Importo',
					data: 'amount',
					render: DataFormatterService.centsToScreenPrice,
				},
				{
					title: 'Usato',
					data: '_used',
					render: v => v ? 'Vero' : '',
				},
			],
		};
	}

}
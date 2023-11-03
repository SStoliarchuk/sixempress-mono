import { AbstractEditor, CustomValidators, FieldsFactory, IEditorPart, SelectFieldValue } from '@sixempress/main-fe-lib';
import { FormControl, Validators } from 'react-reactive-form';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { CustomerController } from '../customers/customer.controller';
import { MovementMedium, MovementMediumLabel } from '../movements/Movement';
import { Coupon, CouponDiscountType, CouponDiscountTypeLabel } from './Coupon';
import { CouponController } from './Coupon.controller';

export class CouponEditor extends AbstractEditor<Coupon> {

	controller = new CouponController();

	generateEditorSettings(val: Coupon = {} as any): IEditorPart<Coupon>[] {
		return [
			{
				type: 'abstractControl',
				logic: { key: 'date', control: new FormControl(val.date) }
			},
			{
				type: 'abstractControl',
				logic: { key: 'code', control: new FormControl(val.code) }
			},
			{
				type: 'abstractControl',
				logic: { key: 'discountType', control: new FormControl(CouponDiscountType.fixed) }
			},
			{
				type: 'formControl',
				logic: {
					component: 'PriceField',
					key: 'amount',
					label: 'Importo',
					required: true,
				}
			},
			{
				type: 'formControl',
				attributes: {required: [Attribute.viewCustomers]},
				logic: {
					component: 'SelectAsyncModel',
					props: CustomerController.AmtsFieldProps(),
					key: 'customer',
					label: 'Cliente',
				},
			},
			{
				type: 'formControl',
				wrapRender: (r) => (
					<>
						<FieldsFactory.Switch
							checked={Boolean(this.state.formGroup.value.paymentMedium)}
							onChange={() => this.state.formGroup.get('paymentMedium').patchValue(
								this.state.formGroup.value.paymentMedium ? undefined : MovementMedium.unspecified
							)}
							label='Il cliente ha pagato questo buono'
						/>
						{Boolean(this.state.formGroup.value.paymentMedium) && r}
					</>
				),
				logic: {
					key: 'paymentMedium',
					label: 'Metodo di Pagamento',
					component: 'SelectField',
					control: new FormControl(val.paymentMedium || MovementMedium.unspecified),
					values: Object.values(MovementMediumLabel).filter(i => typeof i === 'number').map(i => ({
						value: i,
						label: MovementMediumLabel[i]
					})),
				},
			},
			{
				type: 'formControl',
				logic: {
					component: 'TextArea',
					key: 'notes',
					label: 'Note',
				},
			},
		]
	}

	protected generateToSaveObjectByFormGroup(b: Coupon) {
		if (!b.paymentMedium)
			delete b.paymentMedium;
	}

}

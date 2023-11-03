import { Coupon } from "./Coupon";
import { DbObjectSettings, AbstractDbItemController, ABDTProps, ModalService } from "@sixempress/main-fe-lib";
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { SelectDtMode } from "../products/product.controller";
import { ModalProps, TableProps } from "@material-ui/core";
import { ComponentClass } from "react";
import { CouponTable } from "./coupon.table";

export class CouponController extends AbstractDbItemController<Coupon> {
	
	bePath = BePaths.Coupon;
	modelClass = ModelClass.Coupon;

	protected fetchInfo: DbObjectSettings<Coupon> = {};

	/**
	 * Allows you to select items from the table
	 */
	public openSelectDt<SM extends 'single' | 'multi'>(
		mode: SelectDtMode<Coupon, SM>,
		onSelect: SM extends 'single'
			? (id: string, m: Coupon) => void
			: (ids: string[], ms: Coupon[]) => void,
		opts: {
			TableProps?: Partial<TableProps>,
			ModalProps?: ModalProps,
		} = {}
	) {
		const modeToUse = typeof mode === 'string' ? mode : mode.selectMode;

		// manually ovverride prop types
		const modal = ModalService.open<ComponentClass<ABDTProps<Coupon>>>(
			{ content: CouponTable as any },
			{
				isEmbedded: 'select',
				emeddedData: {
					selectMode: modeToUse as 'single' | 'multi',
					onSelectConfirm: (i, m) => {
						modal.close();
						(onSelect as any)(i, m);
					},
				},
				...(opts.TableProps || {}),
			},
			{
				maxWidth: 'lg',
				fullWidth: true,
				removePaper: true,
				...(opts.ModalProps || {}),
			},
		);
		return modal;
	}
}

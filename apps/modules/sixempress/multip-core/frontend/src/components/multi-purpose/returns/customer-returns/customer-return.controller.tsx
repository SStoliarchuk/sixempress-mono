import React, { useEffect } from 'react';
import { CustomerReturn, CustomerReturnStatus } from "./CustomerReturn";
import { DbObjectSettings, DataFormatterService } from "@sixempress/main-fe-lib";
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { CustomerController } from '../../customers/customer.controller';
import { PricedRowsController } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows/priced-rows.controller';
import { Coupon } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/coupons/Coupon';
import { CouponController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/coupons/Coupon.controller';
import { CircularProgress } from '@material-ui/core';

export class CustomerReturnController extends PricedRowsController<CustomerReturn> {
	
	bePath = BePaths.customerreturns;
	modelClass = ModelClass.CustomerReturn;
	
	protected fetchInfo: DbObjectSettings<CustomerReturn> = {
		customer: { },
		list: [{
			products: [{
				item: { },
			}]
		}]
	};


	getDetailsRender(item: CustomerReturn) {
		return (
			<div className='peek-div-info-container'>
				<div className='peek-div-info-card'>
					<table className='peek-card-table'>
						<tbody>
							<tr>
								<th>Data: </th>
								<td>{DataFormatterService.formatUnixDate(item._created._timestamp)}</td>
							</tr>
							{item.customer && (
								<tr>
									<th>Cliente: </th>
									<td>{CustomerController.formatCustomerName(item.customer.fetched)}</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{PricedRowsController.generatePeekPreviewCard(item)}
				
				<RetrieveCoupon item={item}/>

			</div>
		);
	}

}

function RetrieveCoupon(p: {item: CustomerReturn}) {

	const [coupons, setCoupons] = React.useState<Coupon[]>(undefined);
	useEffect(() => {
		if (p.item.status !== CustomerReturnStatus.generatedCoupon)
			return;

		new CouponController().getMulti({params: {filter: {'_generatedFrom.id': p.item._id}}, disableLoading: true}).then(res => setCoupons(res.data));
	}, []);

	if (p.item.status !== CustomerReturnStatus.generatedCoupon)
		return null;
	
	if (!coupons)
		return (
			<div className='peek-div-info-card'>
				<CircularProgress/>
			</div>
		);

	return (
		<div className='peek-div-info-card'>
			<div>Coupons:</div>
			<div>
				{coupons.map(c => <>{c.code} {c._used ? 'Usato' : ''}<br/></>)}
			</div>
		</div>
	);


}
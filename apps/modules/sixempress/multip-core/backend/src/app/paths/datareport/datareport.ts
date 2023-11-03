import to from 'await-to-js';
import moment from 'moment';
import { CustomExpressApp, RequestHelperService, AuthHelperService } from '@sixempress/main-be-lib';
import { Attribute } from '../../utils/enums/attributes.enum';
import { BePaths } from '../../utils/enums/bepaths.enum'
import { MovementController } from '../movements/Movement.controller';
import { getProductsDataReport, getProductsTotalAmounts, getTopSoldProducts } from './products-report';
import { CustomerController } from '../customers/Customer.controller';
import { SaleController } from '../sales/Sale.controller';
import { Movement, MovementDirection } from '../movements/Movement';
import { SaleAnalysisController } from '../sale-analyses/SaleAnalysis.controller';
import { CardsResponse } from './datareport.dtd';
import { CustomerOrderController } from '../customer-orders/CustomerOrder.controller';
import { CustomerReturnController } from '../customer-returns/CustomerReturn.controller';
import { ProductMovementController } from '../products/product-movements/ProductMovement.controller';
import { ProductMovementType } from '../products/product-movements/ProductMovement';
import { SaleAnalysisStatus } from '../sale-analyses/SaleAnalysis.dtd';

export function generateDatereportPaths(
	app: CustomExpressApp,
) {
	
	
	/**
	 * Gets the data for the dashboard
	 */
	app.get('/' + BePaths.dashboarddata, RequestHelperService.safeHandler(async (req, res) => {

		const m = () => moment().utcOffset(+req.header('x-tz'));
		const createdTodayFilter = { '_created._timestamp': { $gte: m().startOf('d').unix(), $lte: m().endOf('d').unix() } };
		const dateTodayFilter = { 'date': { $gte: m().startOf('d').unix(), $lte: m().endOf('d').unix() } };
		const dateEndTodayFilter = { 'endDate': { $gte: m().startOf('d').unix(), $lte: m().endOf('d').unix() } };
		
		const coc = new CustomerOrderController();
		const custOrdStat = [...coc.modelStatus.draft, ...coc.modelStatus.fail, ...coc.modelStatus.success, ...coc.modelStatus.successPrePay];

		const data: CardsResponse = {
			clients: {
				today: await new CustomerController().countForUser(req, createdTodayFilter),
				total: await new CustomerController().countForUser(req),
			},
			orders: {
				today: await new CustomerOrderController().countForUser(req, dateTodayFilter),
				toComplete: await new CustomerOrderController().countForUser(req, { status: { $nin: custOrdStat}}),
			},
			products: {
				sold: Math.abs((await new ProductMovementController().aggregateForUser(req, [
					{ $match: { ...dateTodayFilter, movementType: ProductMovementType.sellProducts } },
					{ $group: {_id: '', amount: {$sum: '$amount'}} }
				]))[0]?.amount || 0),
				total: (await getProductsTotalAmounts(req)).allProductAmount,
			},
			returns: {
				today: await new CustomerReturnController().countForUser(req, dateTodayFilter),
				total: await new CustomerReturnController().countForUser(req),
			},
			sales: {
				today: await new SaleController().countForUser(req, dateTodayFilter),
				total: await new SaleController().countForUser(req),
			},
			movements: {
				in: (await new MovementController().aggregateForUser(req, [
					{ $match: { ...dateTodayFilter, direction: MovementDirection.input } },
					{ $group: { _id: '', priceAmount: { $sum: '$priceAmount' } } }
				]))[0]?.priceAmount || 0,
				out: (await new MovementController().aggregateForUser(req, [
					{ $match: { ...dateTodayFilter, direction: MovementDirection.output } },
					{ $group: { _id: '', priceAmount: { $sum: '$priceAmount' } } }
				]))[0]?.priceAmount || 0,
			},
			analysis: {
				net: (await new SaleAnalysisController().aggregateForUser(req, [
					{ $match: { ...dateEndTodayFilter, status: SaleAnalysisStatus.success } },
					{ $group: { _id: '', totalPrice: { $sum: '$_priceMeta.net' } } }
				]))[0]?.totalPrice || 0,
				toPay: (await new SaleAnalysisController().aggregateForUser(req, [
					{ $match: { status: SaleAnalysisStatus.successPrePay } },
					{ $group: { _id: '', totalPrice: { $sum: '$totalPrice' } } }
				]))[0]?.totalPrice || 0,
			},
			site: await use_filter.sxmp_is_website_connected(req, {connected: false}),
		};

		return data;
	}));

	app.get('/' + BePaths.productsdatareport, AuthHelperService.requireAttributes([Attribute.viewProductsReport]), async (req, res) => {
		const [err, toSend] = await to(getProductsDataReport(req));
		if (err) return RequestHelperService.respondWithError(res, err);

		res.status(200).send(toSend);
	});

	app.get('/' + BePaths.productsdatareport + 'topsold', AuthHelperService.requireAttributes([Attribute.viewProductsReport]), async (req, res) => {
		const [err, toSend] = await to(getTopSoldProducts(req));
		if (err) return RequestHelperService.respondWithError(res, err);

		res.status(200).send(toSend);
	});

	app.get('/' + BePaths.productsdatareport + 'topsold/details', AuthHelperService.requireAttributes([Attribute.viewProductsReport]), async (req, res) => {
		const [err, toSend] = await to(getTopSoldProducts(req, undefined, undefined, -1, true));
		if (err) return RequestHelperService.respondWithError(res, err);

		res.status(200).send(toSend);
	});

}

function dateInRange(from: number, to: number, date: number) {
	return date >= from && date <= to;
}

import to from "await-to-js";
import { Request } from "express";
import { CS, SaveOptions, ObjectUtils, } from "@sixempress/main-be-lib";
import { Attribute } from '@utils/enums/attributes.enum';
import { SysCollection } from '@utils/enums/sys-collections.enum';
import { ModelClass } from '@utils/enums/model-class.enum';
import { Filter, ObjectId } from "mongodb";
import { dropDatabase, FetchableField, generateAuthzString, generateRequestObject, testSlug } from "../../../../tests/setupTests";
import { Movement, MovementDirection } from "../../movements/Movement";
import { Product, ProductType } from "../Product";
import { ProductMovement, ProductMovementType } from "../product-movements/ProductMovement";
import { ProductMovementController } from "../product-movements/ProductMovement.controller";
import { ProductController } from "../Product.controller";
import { ProductGroup } from "../ProductGroup";
import { ProductGroupController } from "../ProductGroup.controller";


type PartialPMov = Partial<ProductMovement & {pid?: string | ObjectId, gid?: string}>;

const partToFull =  (movs: PartialPMov[]): ProductMovement[] => {
		for (const m of movs) {
			m.targetProductInfo = { 
				productsGroupId: m.gid || utils.dbProducts[0]._trackableGroupId || new ObjectId().toString(), 
				product:  new FetchableField(m.pid || utils.dbProducts[0].models[0]._id || new ObjectId(), ModelClass.Product),
				...(m.targetProductInfo || {})
			};
			delete m.pid;
			delete m.gid;

			m.documentLocation = m.documentLocation ?? '1';
			m.movementType = m.movementType ?? ProductMovementType.manualChange;
			m.amount = m.amount ?? 1;
			m.documentLocationsFilter = m.documentLocationsFilter ?? ['1'];
		}
		return movs as any;
	};

const utils = {
	controller: new ProductMovementController(),

	contr: tt.getBaseControllerUtils<ProductMovement, PartialPMov, ProductMovementController>({
		controller: new ProductMovementController(),
		partialToFull: partToFull,
	}),
	getReqObj: generateRequestObject,
	
	getProdColl: () => CS.db.db(testSlug).collection(SysCollection.Product),
	dbProducts: [] as ProductGroup[],
	setBaseSaleableItems: async (keepOldObjects?: boolean) => {

		const prods: (Omit<ProductGroup, 'models'> & {models: Partial<Product>[]})[] = [
			{
				groupData: { type: ProductType.product, name: "prod1" },
				models: [{
					variationData: {buyPrice: 1, sellPrice: 1, variants: []},
					infoData: {barcode: []},
				}],
				documentLocation: "1",
				documentLocationsFilter: ["*"],
			},
			{
				groupData: { type: ProductType.product, name: "prod2" },
				models: [{
					variationData: {buyPrice: 1, sellPrice: 1, variants: []},
					infoData: {barcode: [],},
				}],

				documentLocation: "1",
				documentLocationsFilter: ["*"],
			},
			{
				groupData: { type: ProductType.product, name: "prod3" },
				models: [{
					variationData: {buyPrice: 1, sellPrice: 1, variants: []},
					infoData: {barcode: [],},
				}],

				documentLocation: "1",
				documentLocationsFilter: ["*"],
			},
			{
				groupData: {type: ProductType.replacement, name: "repl1", },
				models: [{
					variationData: {buyPrice: 1, sellPrice: 1, variants: []},
					infoData: {barcode: [],},
				}],

				documentLocation: "1",
				documentLocationsFilter: ["*"],
			},
		];

		if (keepOldObjects !== true) { await utils.getProdColl().deleteMany({}) as any; }
		let res = await new ProductGroupController().saveToDb(utils.getReqObj(), prods as any);
		utils.dbProducts = res.ops.map(i => { i._id = i._id.toString(); return i; });
	},

	prodController: tt.getProdController(),

	dropMovs: async () => CS.db.db(testSlug).collection(SysCollection.Movement).deleteMany({}) as any,
	getMovs: async (f?: any): Promise<Movement[]> => CS.db.db(testSlug).collection(SysCollection.Movement).find(f).toArray(),

	dropProds: async () => utils.getProdColl().deleteMany({}) as any,
	getProds: async (f?: any): Promise<Product[]> => utils.getProdColl().find(f).toArray(),

	dropPMovs: (): Promise<void> => CS.db.db(testSlug).collection(SysCollection.ProductMovement).deleteMany({}) as any,
	getPMovs: (): Promise<ProductMovement[]> => CS.db.db(testSlug).collection(SysCollection.ProductMovement).find().toArray(),

	presave: partToFull,

	ensureTargetProductsArePresent: async (movs: ProductMovement[]) => {
		const allIds = ObjectUtils.removeDuplicates(movs.map(m => m.targetProductInfo.product.id)).map(i => new ObjectId(i));
		const items = await new ProductController().getCollToUse(utils.getReqObj()).find({_id: {$in: allIds}}).toArray();
		
		const fetchedProdsIds = items.map(p => p._id.toString());
		const missingIds: string[] = allIds.filter(i => !fetchedProdsIds.includes(i.toString())).map(i => i.toString());

		const prodsToAdd: ProductGroup[] = missingIds.map(id => ({
			groupData: { type: ProductType.product, name: id },
			models: [{
				_id: new ObjectId(id),
				variationData: {buyPrice: 1, sellPrice: 1, variants: []},
				infoData: {barcode: []},
				
				groupData: { type: ProductType.product, name: id },
				documentLocationsFilter: ["*"],
			}],
			documentLocation: "1",
			documentLocationsFilter: ["*"],
		}));

		await new ProductGroupController().saveToDb(utils.getReqObj(), prodsToAdd);
	},

	save: async (movs: (PartialPMov | ProductMovement)[], opts: SaveOptions & {req?: Request, skipEnsureTargetProdutcts?: boolean} = {}) => {
		utils.presave(movs);
		if (opts.skipEnsureTargetProdutcts !== true) {
			await utils.ensureTargetProductsArePresent(movs as ProductMovement[]);
		}
		const req = opts.req || utils.getReqObj();
		req.originalUrl = '/productmovements/';
		return utils.controller.saveToDb(req, movs as ProductMovement[], {allowAllLocations: true, ...opts});
	},

	saveLoad: (movs: (PartialPMov | ProductMovement)[], opts: SaveOptions & {req?: Request} = {}) => {
		for (const m of movs) { m.movementType = ProductMovementType.loadProducts; }
		return utils.save(movs, opts);
	},

}

beforeEach(async () => {
	await dropDatabase();
	await utils.setBaseSaleableItems();
});

describe("ProductMovementController", () => {
	
	it('ensures all the products ids are present during save', async () => {
		let e, d;

		[e, d] = await to(utils.save([
			{pid: utils.dbProducts[2].models[0]._id},
			{pid: utils.dbProducts[0].models[0]._id},
			{pid: utils.dbProducts[1].models[0]._id},
			{pid: utils.dbProducts[1].models[0]._id},
		], {skipEnsureTargetProdutcts: true}));
		expect(e).toBe(null);
		
		[e, d] = await to(utils.save([
			{pid: utils.dbProducts[2].models[0]._id},
			{pid: new ObjectId()},
			{pid: utils.dbProducts[0].models[0]._id},
			{pid: utils.dbProducts[1].models[0]._id},
			{pid: utils.dbProducts[1].models[0]._id},
		], {skipEnsureTargetProdutcts: true}));
		expect(e).not.toBe(null);

		[e, d] = await to(utils.save([
			{pid: new ObjectId()},
		], {skipEnsureTargetProdutcts: true}));
		expect(e).not.toBe(null);
	});

	describe('adds/overrides given groupId by reading it from db', () => {

		it('normal products', async () => {
			await utils.save([
				{pid: utils.dbProducts[2].models[0]._id, gid: new ObjectId().toString()},
				{pid: utils.dbProducts[1].models[0]._id},
				{pid: utils.dbProducts[0].models[0]._id},
				{pid: utils.dbProducts[2].models[0]._id},
				{pid: utils.dbProducts[2].models[0]._id, gid: new ObjectId().toString()},
			]);
	
			// ensure it does even with a deleted product
	
			let res = await utils.getPMovs();
			const eo = expect.objectContaining;
			expect(res).toEqual([
				eo({targetProductInfo: eo({productsGroupId: utils.dbProducts[2]._trackableGroupId, product: eo({id: utils.dbProducts[2].models[0]._id.toString()})})}),
				eo({targetProductInfo: eo({productsGroupId: utils.dbProducts[1]._trackableGroupId, product: eo({id: utils.dbProducts[1].models[0]._id.toString()})})}),
				eo({targetProductInfo: eo({productsGroupId: utils.dbProducts[0]._trackableGroupId, product: eo({id: utils.dbProducts[0].models[0]._id.toString()})})}),
				eo({targetProductInfo: eo({productsGroupId: utils.dbProducts[2]._trackableGroupId, product: eo({id: utils.dbProducts[2].models[0]._id.toString()})})}),
				eo({targetProductInfo: eo({productsGroupId: utils.dbProducts[2]._trackableGroupId, product: eo({id: utils.dbProducts[2].models[0]._id.toString()})})}),
			])
		});

		it.todo('with deleted products');
		
	});

	it("overrides the documentLocationsFilter to the given documentLocation", async () => {
		const movs = utils.presave([{}]);
		movs.forEach(m => (m.documentLocation = "quakc") && delete m.documentLocationsFilter);
		await utils.controller.saveToDb(utils.getReqObj(), movs, {allowAllLocations: true});

		let saved = await utils.getPMovs();
		for (const s of saved) {
			expect(s.documentLocation).toBe("quakc");
			expect(s.documentLocationsFilter).toEqual(["quakc"]);
		}
	});

	it("recalculates the approx amount in the product on delete/insert", async () => {
		const mock = jest.spyOn(ProductMovementController.prototype, 'recalculateApproxProdAmount' as any);

		let id1 = new ObjectId().toString();
		let id2 = new ObjectId().toString();
		await utils.save([{pid: id1}, {pid: id2}]);
		expect(mock).toHaveBeenCalledTimes(1);
		expect(mock).toHaveBeenLastCalledWith(expect.anything(), [id1, id2]);

		await utils.controller.deleteForUser(utils.getReqObj(), {"targetProductInfo.product.id": {$in: [id1, id2]}}, {deleteMulti: true});
		expect(mock).toHaveBeenCalledTimes(2);
		expect(mock).toHaveBeenLastCalledWith(expect.anything(), [id1, id2]);

		mock.mockRestore();
	});

	describe("recalculateApproxProdAmount()", () => {

		const fn = async (ids?: string[], req = utils.getReqObj()) => {
			ids = ids || (await utils.getProdColl().find().toArray()).map(i => i._id.toString());
			return utils.controller['recalculateApproxProdAmount'](req, ids);
		}
		
		it.todo('ensure the amounts are not filtered/projected..');

		it("create _approx fields with all the movs data, regardles of user visiblity", async () => {

			const id1: any = new ObjectId();
			const id2: any = new ObjectId();
			const id3: any = new ObjectId();
			await dropDatabase();
			await utils.save([
				{pid: id1, amount: 51, documentLocation: "qqq"},
				{pid: id1, amount: 72, documentLocation: "33"},
				// these two cancel each other
				{pid: id1, amount: 11, documentLocation: "asd"},
				{pid: id1, amount: -11, documentLocation: "asd"},

				// these two do not cancel each other
				{pid: id2, amount: 2, documentLocation: "10"},
				{pid: id2, amount: -2, documentLocation: "105"},

				{pid: id2, amount: 1, documentLocation: "666"},
				{pid: id2, amount: 5, documentLocation: "66"},
			]);
			
			// we delete all data to ensure no approx field is present or anything else
			// just _id fields
			await utils.getProdColl().deleteMany({_id: {$in: [id1, id2, id3]}});
			await utils.getProdColl().insertMany([{_id: id1}, {_id: id2}, {_id: id3}]);
			let models: Product[] = await utils.getProdColl().find().toArray(); 
			for (const m of models) {
				expect(m._approximateTotalAmount).toBe(undefined);
				expect(m._approximateAmountData).toBe(undefined);
			}


			const reqAuth = generateAuthzString({userLocs: ['1']});
			await fn(undefined, generateRequestObject({authzString: reqAuth}));

			models = await utils.getProdColl().find().toArray(); 
			const msHm: {[id: string]: Product} = ObjectUtils.arrayToHashmap(models, '_id');
			for (const m of models) {
				expect(m._approximateTotalAmount).not.toBe(undefined);
				expect(m._approximateAmountData).not.toBe(undefined);
			}
			
			expect(msHm[id1]._approximateAmountData).toEqual({'33': 72, 'qqq': 51});
			expect(msHm[id1]._approximateTotalAmount).toEqual(123);
			
			expect(msHm[id2]._approximateAmountData).toEqual({'10': 2, '66': 5, '105': -2, '666': 1});
			expect(msHm[id2]._approximateTotalAmount).toEqual(6);

			expect(msHm[id3]._approximateAmountData).toEqual({});
			expect(msHm[id3]._approximateTotalAmount).toEqual(0);
		});

	});

	describe("calculateRealProductsAmount()", () => {
		
		/**
		 * @param prodIds If you use string or ObjectId the item will be queried by its entirety, else the given item will be used
		 * @param filter The filter additional for calculating real prod amount
		 */
		const fn = async (
			prodIds: (string | ObjectId | {_id: string | Object, _approximateTotalAmount: number, _approximateAmountData: {[h: string]: number}})[],
			filter?: Filter<any>,
			reqObj = utils.getReqObj(),
		) => {
			const allIds = prodIds.map(i => new ObjectId((i as any)._id ? (i as any)._id : i.toString()));
			// we query the item to get groupData.type
			const prodsHm: {[id: string]: Product} = ObjectUtils.arrayToHashmap(await utils.getProds({_id: {$in: allIds}}), '_id');
			
			
			// ensure the items are in the same position as given in input
			const remappedIdsPositions = prodIds.map((item, idx) => (item as any)._id 
				// use the given item and add the type
				? {...item as any, groupData: prodsHm[allIds[idx].toString()].groupData} 
				// use the queried item
				: prodsHm[allIds[idx].toString()]
			);

			await utils.controller.calculateRealProductsAmount(reqObj, remappedIdsPositions, filter);
			return remappedIdsPositions;
		}

		it('adds _reserved _returns fields', async () => {
			await utils.save([
				// add 20 to base stock
				{pid: utils.dbProducts[0].models[0]._id, amount: 20, movementType: ProductMovementType.manualChange},
				// 10 are damaged returns
				{pid: utils.dbProducts[0].models[0]._id, amount: -10, movementType: ProductMovementType.brokenItem},
				// 10 are reserved
				{pid: utils.dbProducts[0].models[0]._id, amount: -10, movementType: ProductMovementType.reserveOrIncoming},

				// same as above
				{pid: utils.dbProducts[3].models[0]._id, amount: 20, movementType: ProductMovementType.manualChange},
				{pid: utils.dbProducts[3].models[0]._id, amount: -10, movementType: ProductMovementType.brokenItem},
				{pid: utils.dbProducts[3].models[0]._id, amount: -10, movementType: ProductMovementType.reserveOrIncoming},
			]);

			expect(await fn([
				utils.dbProducts[0].models[0]._id,
				utils.dbProducts[3].models[0]._id,
			])).toEqual([
				// expect no available stock, and some reserved/returned data
				expect.objectContaining({_amountData: {}, _totalAmount: 0, _reservedData: {'1': 10}, _returnedData: {'1': 10}}),
				expect.objectContaining({_amountData: {}, _totalAmount: 0, _reservedData: {'1': 10}, _returnedData: {'1': 10}}),
			])
		});

		it.skip('filters the movements by the attribute', async () => {
			
			await utils.save([
				{pid: utils.dbProducts[0].models[0]._id, amount: 10},
				{pid: utils.dbProducts[3].models[0]._id, amount: 10},
			]);

			const getList = async (userAtts: number[]) => {
				let res = await fn(
					[utils.dbProducts[0].models[0]._id, utils.dbProducts[3].models[0]._id], 
					undefined, 
					utils.getReqObj({authzString: {userAtts}})
				);
				return res.map(r => ([r._amountData, r._totalAmount]));
			}

			expect(await getList([1])).toEqual([
				[{'1': 10}, 10],
				[{'1': 10}, 10],
			]);

			expect(await getList([5])).toEqual([
				[{}, 0],
				[{}, 0],
			]);

			expect(await getList([Attribute.viewProductMovements])).toEqual([
				[{'1': 10}, 10],
				[{}, 0],
			]);

			expect(await getList([Attribute.viewProductMovements])).toEqual([
				[{'1': 10}, 10],
				[{'1': 10}, 10],
			]);

		});

		it("sets correct amounts in the products array", async () => {

			await utils.save([
				{pid: utils.dbProducts[1].models[0]._id},

				{pid: utils.dbProducts[0].models[0]._id, amount: -1, documentLocation: '2'},
				{pid: utils.dbProducts[0].models[0]._id, amount: 10, documentLocation: '2'},
				{pid: utils.dbProducts[0].models[0]._id, amount: 5, documentLocation: '1'},
			]);

			expect(await fn([
				utils.dbProducts[1].models[0]._id,
				utils.dbProducts[0].models[0]._id,
			])).toEqual([
				expect.objectContaining({ _amountData: {'1': 1}, _totalAmount: 1 }),
				expect.objectContaining({ _amountData: {'1': 5, '2': 9}, _totalAmount: 14 }),
			]);

		});

		it("Fixes _approximate amounts if the approx is not correct", async () => {

			await utils.save([
				{pid: utils.dbProducts[1].models[0]._id},
				
				{pid: utils.dbProducts[0].models[0]._id, amount: -1, documentLocation: '2'},
				{pid: utils.dbProducts[0].models[0]._id, amount: 10, documentLocation: '2'},
				{pid: utils.dbProducts[0].models[0]._id, amount: 5, documentLocation: '1'},
			]);
			const mock = jest.spyOn(ProductMovementController.prototype, 'recalculateApproxProdAmount' as any);

			/**
			 * it is corect, so no call
			 */
			expect(await fn([
				{_id: utils.dbProducts[1].models[0]._id, _approximateAmountData: {'1': 1}, _approximateTotalAmount: 1},
				{_id: utils.dbProducts[0].models[0]._id, _approximateAmountData: {'1': 5, '2': 9}, _approximateTotalAmount: 14},
			])).toEqual([
				expect.objectContaining({ _amountData: {'1': 1}, _totalAmount: 1 }),
				expect.objectContaining({ _amountData: {'1': 5, '2': 9}, _totalAmount: 14 }),
			]);
			expect(mock).toHaveBeenCalledTimes(0);

			/**
			 * the approx fields are missing so no call either
			 * (could be the case if the Product[] array has been projected withouth the _approx fields)
			 */
			expect(await fn([
				utils.dbProducts[1].models[0]._id,
				utils.dbProducts[0].models[0]._id,
			])).toEqual([
				expect.objectContaining({ _amountData: {'1': 1}, _totalAmount: 1 }),
				expect.objectContaining({ _amountData: {'1': 5, '2': 9}, _totalAmount: 14 }),
			]);
			expect(mock).toHaveBeenCalledTimes(0);


			/**
			 * total amount not correct
			 */
			expect(await fn([
				{_id: utils.dbProducts[1].models[0]._id, _approximateAmountData: {'1': 1}, _approximateTotalAmount: 0},
			])).toEqual([
				expect.objectContaining({ _amountData: {'1': 1}, _totalAmount: 1 }),
			]);
			expect(mock).toHaveBeenCalledTimes(1);
			expect(mock).toHaveBeenLastCalledWith(expect.anything(), [utils.dbProducts[1].models[0]._id.toString()]);

			/**
			 * diff amount data
			 */
			expect(await fn([
				{_id: utils.dbProducts[1].models[0]._id, _approximateAmountData: {'1': 1, '2': 1}, _approximateTotalAmount: 1},
				{_id: utils.dbProducts[0].models[0]._id, _approximateAmountData: {'1': 5}, _approximateTotalAmount: 1},
			])).toEqual([
				expect.objectContaining({ _amountData: {'1': 1}, _totalAmount: 1 }),
				expect.objectContaining({ _amountData: {'1': 5, '2': 9}, _totalAmount: 14 }),
			]);
			expect(mock).toHaveBeenCalledTimes(2);
			expect(mock).toHaveBeenLastCalledWith(expect.anything(), [utils.dbProducts[1].models[0]._id.toString(), utils.dbProducts[0].models[0]._id.toString()]);

			mock.mockRestore();
		});

		it("if an additional query filter is passed, it updates the _approx data, and call recalculate() only if the remaining data are different", async () => {
			await utils.save([
				{pid: utils.dbProducts[1].models[0]._id},

				{pid: utils.dbProducts[0].models[0]._id, amount: -1, documentLocation: '2'},
				{pid: utils.dbProducts[0].models[0]._id, amount: 10, documentLocation: '2'},

				{pid: utils.dbProducts[0].models[0]._id, amount: -1, documentLocation: '1'},
				{pid: utils.dbProducts[0].models[0]._id, amount: 5, documentLocation: '1'},
			]);
			const mock = jest.spyOn(ProductMovementController.prototype, 'recalculateApproxProdAmount' as any);

			expect(await fn([
				{_id: utils.dbProducts[1].models[0]._id, _approximateAmountData: {'1': 1}, _approximateTotalAmount: 1},
				{_id: utils.dbProducts[0].models[0]._id, _approximateAmountData: {'1': 4, '2': 9}, _approximateTotalAmount: 13},
			])).toEqual([
				expect.objectContaining({ _amountData: {'1': 1}, _totalAmount: 1, _approximateAmountData: {'1': 1}, _approximateTotalAmount: 1, }),
				expect.objectContaining({ _amountData: {'1': 4, '2': 9}, _totalAmount: 13, _approximateAmountData: {'1': 4, '2': 9}, _approximateTotalAmount: 13, }),
			]);
			expect(mock).toHaveBeenCalledTimes(0);

			expect(await fn([
				{_id: utils.dbProducts[1].models[0]._id, _approximateAmountData: {'1': 1}, _approximateTotalAmount: 1},
				{_id: utils.dbProducts[0].models[0]._id, _approximateAmountData: {'1': 4, '2': 9}, _approximateTotalAmount: 13},
			], {documentLocation: "2"})).toEqual([
				expect.objectContaining({ _amountData: {}, _totalAmount: 0 }),
				expect.objectContaining({ _amountData: {'2': 9}, _totalAmount: 9, _approximateAmountData: {'2': 9}, _approximateTotalAmount: 9 }),
			]);
			expect(mock).toHaveBeenCalledTimes(0);


			expect(await fn([
				{_id: utils.dbProducts[1].models[0]._id, _approximateAmountData: {'1': 1}, _approximateTotalAmount: 1},
				// note the amount is wrong but we project it so it's hidden
				{_id: utils.dbProducts[0].models[0]._id, _approximateAmountData: {'1': 10101010101001101, '2': 9}, _approximateTotalAmount: 13},
			], {documentLocation: "2"})).toEqual([
				expect.objectContaining({ _amountData: {}, _totalAmount: 0 }),
				expect.objectContaining({ _amountData: {'2': 9}, _totalAmount: 9, _approximateAmountData: {'2': 9}, _approximateTotalAmount: 9 }),
			]);
			expect(mock).toHaveBeenCalledTimes(0);


			// calls recalc because now the visible field is broken
			expect(await fn([
				{_id: utils.dbProducts[1].models[0]._id, _approximateAmountData: {'1': 1}, _approximateTotalAmount: 1},
				// note the amount is wrong but we project it so it's hidden
				{_id: utils.dbProducts[0].models[0]._id, _approximateAmountData: {'1': 10101010101001101, '2': 9}, _approximateTotalAmount: 13},
			], {documentLocation: "1"})).toEqual([
				expect.objectContaining({ _amountData: {'1': 1}, _totalAmount: 1 }),
				expect.objectContaining({ _amountData: {'1': 4}, _totalAmount: 4, _approximateAmountData: {'1': 4}, _approximateTotalAmount: 4 }),
			]);
			expect(mock).toHaveBeenCalledTimes(1);
			expect(mock).toHaveBeenLastCalledWith(expect.anything(), [utils.dbProducts[0].models[0]._id.toString()]);


			mock.mockRestore();
		});

	});

	describe("calculateAmountInProdsForUser()", () => {
		
		const fn = async (opts: {projection?: any, userLocs?: string[], manualLocation?: string } = {}, prodsArr: any[] = []) => {

			const auths = generateAuthzString({userLocs: opts.userLocs});
			const reqObj: any = {authzString: auths, query: {}};
			if (opts.manualLocation) { reqObj.query.locationFilter = opts.manualLocation; }
			if (opts.projection) { reqObj.query.projection = JSON.stringify(opts.projection); }
			const req = utils.getReqObj(reqObj);

			await utils.controller.calculateAmountInProdsForUser(req, prodsArr);
		}

		it("returns if the projections do not show the amounts fields", async () => {
			
			const mock = jest.spyOn(ProductMovementController.prototype, 'calculateRealProductsAmount').mockImplementation((() => {}) as any);
			let callCount = 0;
			
			const triggerFields = ['_amountData', '_totalAmount', 'models._amountData', 'models._totalAmount'];
			
			// 1 requested
			await fn({projection: {_amountData: 1}});
			expect(mock).toHaveBeenCalledTimes(++callCount);

			// none hidden
			await fn({projection: {asd: 1}});
			expect(mock).toHaveBeenCalledTimes(callCount);

			// not all hidden
			await fn({projection: {_amountData: 0}});
			expect(mock).toHaveBeenCalledTimes(++callCount);

			// not all hidden
			await fn({projection: {'_amountData': 0, '_totalAmount': 0, 'models._totalAmount': 0}});
			expect(mock).toHaveBeenCalledTimes(++callCount);

			// all hidden
			await fn({projection: {'_amountData': 0, '_totalAmount': 0, 'models._amountData': 0, 'models._totalAmount': 0}});
			expect(mock).toHaveBeenCalledTimes(callCount);

			mock.mockRestore();
		});

		// TODO re add this once we have the location filter (disabled for musthave) per model logic
		it.skip("calls the realfn withouth any filter", async () => {
			const mock = jest.spyOn(ProductMovementController.prototype, 'calculateRealProductsAmount').mockImplementation((() => {}) as any);
			
			await fn({}, ['a', 1, 2]);
			expect(mock).toHaveBeenCalledTimes(1);
			expect(mock).toHaveBeenLastCalledWith(expect.anything(), ['a', 1, 2], undefined);

			mock.mockRestore();
		});

		// TODO re add this once we have the location filter (disabled for musthave) per model logic
		it.skip("adds the user location if not wildcard", async () => {
			const mock = jest.spyOn(ProductMovementController.prototype, 'calculateRealProductsAmount').mockImplementation((() => {}) as any);
			
			await fn({userLocs: ['1', '2aaaaaa']}, ['a', 1, 2]);
			expect(mock).toHaveBeenCalledTimes(1);
			expect(mock).toHaveBeenLastCalledWith(expect.anything(), ['a', 1, 2], {documentLocation: {$in: ['1', '2aaaaaa']}});

			mock.mockRestore();
		});

		// TODO re add this once we have the location filter (disabled for musthave) per model logic
		it.skip("adds the user manualLocation only if allowed for the user", async () => {
			const mock = jest.spyOn(ProductMovementController.prototype, 'calculateRealProductsAmount').mockImplementation((() => {}) as any);
			
			// wildcard
			await fn({manualLocation: "1askdasd", userLocs: ['*']});
			expect(mock).toHaveBeenCalledTimes(1);
			expect(mock).toHaveBeenLastCalledWith(expect.anything(), expect.any(Array), {documentLocation: '1askdasd'});

			// normal access
			await fn({manualLocation: "1", userLocs: ['1', '2aaaaaa']});
			expect(mock).toHaveBeenCalledTimes(2);
			expect(mock).toHaveBeenLastCalledWith(expect.anything(), expect.any(Array), {documentLocation: '1'});

			// throws if not allowed manual loc
			const [e, d] = await to(fn({manualLocation: "1", userLocs: ['12', '2aaaaaa']}));
			expect(e).not.toBe(null);

			mock.mockRestore();
		});


	});

	// when the item is reserved we remove that stock from available
	// when we transfer the item, then we remove the stock from the origin, but dont add it to the destination until the trasnfer is complete
	//
	// when we create a customer order with automatic transfer then the stock is reduced by both the reserved items and the reserved/incoming stock of the transfer
	// meaning if we do -1 for an online order, we do -1 for online and -1 for second store stock, removing twice the available stock
	//
	// the solution is to NOT do -1 if the stock is a saleTransferStock, meaning they both cancel each other out
	it('doesnt remove reserved from available stock but from the automatic tranfer order when it is available', async () => {
		let pgs: ProductGroup[];

		const fn = async () => {
			const pgsF = await utils.prodController.find({_trackableGroupId: {$in: pgs.map(p => p._trackableGroupId)}});
			const models = pgsF[0].models;
			await utils.contr.controller.calculateRealProductsAmount(utils.getReqObj(), models);
			return models;
		}

		const save = async (amount: number, type = ProductMovementType.manualChange) => {
			await utils.contr.save([{gid: pgs[0]._trackableGroupId, pid: pgs[0].models[0]._id.toString(), amount, movementType: type}]);
		}

		pgs = await utils.prodController.save([{ms: [{}]}]);
		expect(await fn()).toEqual(tt.ea([tt.eo({_amountData: {}})]));

		await save(1);
		expect(await fn()).not.toEqual(tt.ea([tt.eo({_amountData: {}})]));
		expect(await fn()).toEqual(tt.ea([tt.eo({_amountData: {'1': 1}, _reservedData: {}, _incomingData: {}})]));

		await save(-1, ProductMovementType.reserveOrIncoming);
		expect(await fn()).toEqual(tt.ea([tt.eo({_amountData: {}, _reservedData: {'1': 1}, _incomingData: {}})]));

		await save(1, ProductMovementType.salePendingTransfer);
		expect(await fn()).toEqual(tt.ea([tt.eo({_amountData: {'1': 1}, _reservedData: {'1': 1}, _incomingData: {'1': 1}})]));
		
		await save(-1, ProductMovementType.reserveOrIncoming);
		expect(await fn()).toEqual(tt.ea([tt.eo({_amountData: {}, _reservedData: {'1': 2}, _incomingData: {'1': 1}})]));
		
		// we add an incoming amount, but it does not cancel out with the reserved amount
		// as this is not a sale transfer
		await save(1, ProductMovementType.reserveOrIncoming);
		expect(await fn()).toEqual(tt.ea([tt.eo({_amountData: {}, _reservedData: {'1': 2}, _incomingData: {'1': 2}})]));
	});

});

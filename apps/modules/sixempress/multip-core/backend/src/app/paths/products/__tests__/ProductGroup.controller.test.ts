import to from "await-to-js";
import { FindOneDbOptions, ObjectUtils, PatchOperation, RequestHelperService, } from "@sixempress/main-be-lib";
import { SysCollection } from '@utils/enums/sys-collections.enum';
import { ModelClass } from '@utils/enums/model-class.enum';
import { Filter, ObjectId } from "mongodb";
import { dropDatabase, FetchableField, generateAuthzString, generateRequestObject, testSlug } from "../../../../tests/setupTests";
import { ProductType, Product } from "../Product";
import { Request } from 'express';
import { ProductMovement, ProductMovementType } from "../product-movements/ProductMovement";
import { ProductMovementController } from "../product-movements/ProductMovement.controller";
import { ProductController } from "../Product.controller";
import { ProductGroup } from "../ProductGroup";
import { ProductGroupController } from "../ProductGroup.controller";
import { ProductGroupControllerLogic } from "../ProductGroup.controller.logic";
import { InternalOrderController } from "@paths/multi-purpose/internal-orders/InternalOrder.controller";
import { InternalOrder } from "@paths/multi-purpose/internal-orders/InternalOrder.dtd";
import { PricedRowsModel } from "@utils/priced-rows/__tests__/priced-rows.test.utils";
import { TransferOrder } from "@paths/multi-purpose/transfer-orders/TransferOrder.dtd";
import { TransferOrderController } from "@paths/multi-purpose/transfer-orders/TransferOrder.controller";
import { CustomerOrder } from "@paths/multi-purpose/customer-orders/CustomerOrder.dtd";
import { CustomerOrderController } from "@paths/multi-purpose/customer-orders/CustomerOrder.controller";
import { PricedRowsSaleModel } from "@utils/priced-rows-sale/priced-rows-sale.dtd";

const ea = tt.arrayContaining;
const eo = expect.objectContaining;

type PartialProd = DeepPartial<Product> & { variationData?: {supplier?: FetchableField<ModelClass.Supplier>} }
type PartialGroup = {
	gd?: Partial<ProductGroup['groupData']>, 
	ms?: Array<PartialProd & {
		v?: Partial<Product['variationData']>, 
		vv?: string[],
		bar?: ProductGroup['infoData']['barcode'],
	}>
}

type PartialPricedRow = Partial<PricedRowsModel> & {
	ps: Array<{
		amount: number,
		id: string | ObjectId,
		tr?: {[loc: string]: number},
	}>;
}

const _internal = {
	partFullPriced: (is) => {
		const ret = [];
		for (const i of is) {
			
			const list: PricedRowsSaleModel<any>['list'] = [];
			if (!i.list && i.ps) {
				const prods: PricedRowsSaleModel<any>['list'][0]['products'] = [];
				for (const p of i.ps) {
					prods.push({amount: p.amount, item: {id: p.id.toString(), modelClass: ModelClass.Product}});
					if (p.tr)
						prods[prods.length - 1].transfer = p.tr;
				}
				list.push({products: prods});
			}

			delete i.ps;
			const t: PricedRowsModel = {
				documentLocationsFilter: ['1'],
				documentLocation: '1',
				physicalLocation: '1',
				payments: [],
				...i as PricedRowsModel,
				list: list,
			};

			ret.push(t);
		}
		return ret;
	}
}

const utils = {
	controller: new ProductGroupController(),

	InternalOrder: tt.getBaseControllerUtils<InternalOrder, PartialPricedRow, InternalOrderController>({
		controller: new InternalOrderController(),
		partialToFull: _internal.partFullPriced,
	}),
	CustomerOrder: tt.getBaseControllerUtils<CustomerOrder, PartialPricedRow, CustomerOrderController>({
		controller: new CustomerOrderController(),
		partialToFull: _internal.partFullPriced,
	}),
	TransferOrder: tt.getBaseControllerUtils<TransferOrder, PartialPricedRow, TransferOrderController>({
		controller: new TransferOrderController(),
		partialToFull: _internal.partFullPriced,
	}),

	getReqObj: generateRequestObject,

	uniqueCounter: 1,
	getUniqueNumber: () => utils.uniqueCounter++,

	presave: (pgs: (Partial<ProductGroup> & PartialGroup)[]) => {
		for (const pg of pgs) {
			pg.groupData = pg.groupData || pg.gd as any;
			pg.models = pg.models || pg.ms as any;
			delete pg.gd;
			delete pg.ms;

			pg.groupData = { name: "name", type: ProductType.product, ...(pg.groupData || {}) };
			pg.models = pg.models || [{} as any];
			pg.documentLocationsFilter = pg.documentLocationsFilter || ["1"];
			
			pg.models = pg.models || [{}] as any;
			for (const p of pg.models) {
				p.infoData = p.infoData || {};

				p.variationData = (p as any as PartialGroup['ms'][0]).v as any|| p.variationData;
				if ((p as any as PartialGroup['ms'][0]).bar) { p.infoData.barcode = (p as any as PartialGroup['ms'][0]).bar; }
				delete (p as any as PartialGroup['ms'][0]).v;
				delete (p as any as PartialGroup['ms'][0]).bar;
				const vv = (p as any as PartialGroup['ms'][0]).vv;
				delete (p as any as PartialGroup['ms'][0]).vv;

				p.variationData = { 
					sellPrice: utils.getUniqueNumber(),
					buyPrice: utils.getUniqueNumber(),
					variants: vv ? vv.map((v, idx) => ({name: idx.toString(), value: v})) : [],
					...(p.variationData || {})
				};
			}
		}
	},

	save: async (pgs: PartialGroup[], opts: {variantsDifferentBarcode?: false | "eachVariant" | "eachVariation"} = {}) => {
		utils.presave(pgs as any);
		const req = utils.getReqObj({query: 
			typeof opts.variantsDifferentBarcode !== 'undefined'
				? {variantsDifferentBarcode: opts.variantsDifferentBarcode.toString()}
				: undefined
		});

		const ops = (await utils.controller.saveToDb(req, pgs as any)).ops;
		return ops;
		// const items = utils.find({_id: {$in: ops.map(o => o._id)}});
	},

	del: async (f: Filter<ProductGroup>) => {
		return utils.controller.deleteForUser(utils.getReqObj(), f);
	},

	findOne: async (id: string | ObjectId, opts?: FindOneDbOptions): Promise<ProductGroup> => {
		return utils.controller.findOneForUser(utils.getReqObj(), {_id: id}, opts);
	},

	find: async (f: Filter<ProductGroup> = {}): Promise<ProductGroup[]> => {
		return utils.controller.findForUser(utils.getReqObj(), f);
	},
	
	patch: async (id: string | ObjectId, ops: PatchOperation<ProductGroup>[]) => {
		const item = await utils.controller.findOneForUser(utils.getReqObj(), {_id: id});
		return utils.controller.patchSingle(utils.getReqObj(), item, ops);
	},

	put: async (id: string | ObjectId, doc: PartialGroup | Partial<ProductGroup>, opts: {reqObj?: Request, objFromBe?: any} = {}) => {
		utils.presave([doc as any]);
		return utils.controller.replaceItem__READ_DESCRIPTION(opts.reqObj || utils.getReqObj(), {_id: id}, doc as ProductGroup, {objFromBe: opts.objFromBe});
	},

	setAmount: async (prodId: string | ObjectId, am: number | {[locId: string]: number}) => {
		const prod: Product = await new ProductController().getCollToUse(utils.getReqObj()).findOne({_id: new ObjectId(prodId.toString())});
		await new ProductMovementController().calculateAmountInProdsForUser(utils.getReqObj(), [prod]);

		const hm: {[locId: string]: number} = typeof am === 'number' ? {['1']: am} : am;
		const movs: ProductMovement[] = [];
		for (const locId in hm) {
			movs.push({
				amount: -(prod._totalAmount - hm[locId]),
				movementType: ProductMovementType.manualChange,
				targetProductInfo: {productsGroupId: prod._trackableGroupId, product: new FetchableField(prod._id, ModelClass.Product)},
				documentLocationsFilter: ['*'],
				documentLocation: locId,
			});
		}
		

		await new ProductMovementController().saveToDb(utils.getReqObj(), movs, {allowAllLocations: true});
	},

	getRawModels: (f?: Filter<ProductGroup>): Promise<Product[]> => {
		return utils.controller.getCollToUse(utils.getReqObj()).find(f).toArray();
	},

}

beforeEach(async () => {
	await dropDatabase();
});


describe("ProductGroupController", () => {

	it.todo('temporary replaces ModelClass for getCollToUse as to emit correct CRUD modelClass');

	describe('restoring the product', () => {

		it('removes colliding unique tags', async () => {
			let pgs = await utils.save([{gd: {uniqueTags: ['123', '456']}, ms: [{}]}]);
			await utils.del({_id: pgs[0]._id});
			expect(await utils.find()).toEqual([]);

			await utils.controller.restoreDeletedForUser(utils.getReqObj(), {_id: pgs[0]._id});
			expect(await utils.find()).toEqual(tt.ea([tt.eo({groupData: tt.eo({uniqueTags: ['123', '456']})})]));

			// remove and create a conflict for restoration
			await utils.del({_id: pgs[0]._id});
			let conflict = await utils.save([{gd: {uniqueTags: ['1xx2', '456']}, ms: [{}]}]);
			await utils.controller.restoreDeletedForUser(utils.getReqObj(), {_id: pgs[0]._id});
			// expect both groups and the old one with the unique cod removed
			expect(await utils.find()).toEqual(tt.ea([
				tt.eo({groupData: tt.eo({uniqueTags: ['1xx2', '456']})}),
				tt.eo({groupData: tt.eo({uniqueTags: ['123']})}),
			]));
		});

		it('removes colliding barcodes', async () => {
			let pgs = await utils.save([{ms: [{infoData: {barcode: ['123', '456']}}]}]);
			await utils.del({_id: pgs[0]._id});
			expect(await utils.find()).toEqual([]);

			await utils.controller.restoreDeletedForUser(utils.getReqObj(), {_id: pgs[0]._id});
			expect(await utils.find()).toEqual(tt.ea([tt.eo({models: tt.ea([tt.eo({infoData: tt.eo({barcode: ['123', '456']})})])})]));

			await utils.del({_id: pgs[0]._id});
			let conflict = await utils.save([{ms: [{infoData: {barcode: ['1xx2', '456']}}]}]);
			await utils.controller.restoreDeletedForUser(utils.getReqObj(), {_id: pgs[0]._id});
			
			expect(await utils.find()).toEqual(tt.ea([
				tt.eo({models: tt.ea([tt.eo({infoData: tt.eo({barcode: ['1xx2', '456']})})])}),
				tt.eo({models: tt.ea([tt.eo({infoData: tt.eo({barcode: ['123']})})])}),
			]));
		});

	});

	it.todo('doesnt allow multiple variations withouth variants');

	describe("Get", () => {
	
		// TODO fix this test
		it("Doesnt return _deleted models ONLY if totalAmount of that model is < 1", async () => {
			const saved = await utils.save([{ms: [{}, {}, {}]}]);
			const setAmount = async (n: number) => { for (const m of saved[0].models) { await utils.setAmount(m._id, n); } }
			let group: ProductGroup;
			const updateGroup = async () => group = (await utils.find())[0];

			// show all on no amount
			await setAmount(0);
			await updateGroup();
			expect(group.models).toHaveLength(3);
			group.models.forEach(m => expect(m._totalAmount).toBe(0));
			expect(group.models.filter(m => m._deleted)).toHaveLength(0);
			
			
			// show all with amount
			await setAmount(1);
			await updateGroup();
			expect(group.models).toHaveLength(3);
			group.models.forEach(m => expect(m._totalAmount).toBe(1));
			expect(group.models.filter(m => m._deleted)).toHaveLength(0);


			// show delete with amount
			group.models.splice(0, 2);
			await utils.put(group._id, group);
			await updateGroup();
			expect(group.models).toHaveLength(3);
			group.models.forEach(m => expect(m._totalAmount).toBe(1));
			expect(group.models.filter(m => m._deleted)).toHaveLength(2);


			// dont show deleted without amount
			await setAmount(0);
			await updateGroup();
			expect(group.models).toHaveLength(1);
			group.models.forEach(m => expect(m._totalAmount).toBe(0));
			expect(group.models.filter(m => m._deleted)).toHaveLength(0);


			// shows negative products
			await setAmount(-5);
			await updateGroup();
			expect(group.models).toHaveLength(3);
			group.models.forEach(m => expect(m._totalAmount).toBe(-5));
			expect(group.models.filter(m => m._deleted)).toHaveLength(2);
		}); 

		describe('filtering on _approxTotalAmount (aka group fields)', () => {
			
			// as we need to check low amount products, we need to check the approx total AFTER the sum, else its an error
			it.todo('allows you to filter _approximateTotalAmount BUT applies that filter AFTER the $group');
	
			// if we delete it by reference, then later when the filters are used for count(), the filters will be
			// incorrect, thus returning all products
			it.todo('doesnt delete _approxiamteTotalAmount field by reference on the original filter object');

		})

		it.todo("filters the field that can be seen based on the attributes that the user have");

		it.todo("retusn the correct productsGet total count (it dont account for deleted productsgroup)");

	});

	describe("Save", () => {

		it("creates _aproxximate amount fields on save", async () => {
			let groups = await utils.save([
				{ms: [{}, {}]},
				{ms: [{}, {}, {}]},
			]);

			let models: Product[] = await utils.getRawModels();
			for (const m of models) {
				expect(m._approximateAmountData).toEqual({});
				expect(m._approximateTotalAmount).toEqual(0);
			}
		});

		it("ensures the variants array has the same length and order", async () => {
			let e, d;
			
			[e, d] = await to(utils.save([{ms: [
				{v: {variants: [{name: '1', value: '1'}]}},
			]}]));
			expect(e).toBeNull();

			[e, d] = await to(utils.save([{ms: [
				{v: {variants: [{name: '1', value: '1'}, {name: '2', value: '2'}]}},
				{v: {variants: [{name: '1', value: '1'}, {name: '2', value: '2'}]}},
			]}]));
			expect(e).toBeNull();

			// diff length
			[e, d] = await to(utils.save([{ms: [
				{v: {variants: [{name: '1', value: '1'}, {name: '2', value: '2'}]}},
				{v: {variants: [{name: '1', value: '1'}]}},
			]}]));
			expect(e).not.toBeNull();

			// diff name
			[e, d] = await to(utils.save([{ms: [
				{v: {variants: [{name: 'a', value: '1'}]}},
				{v: {variants: [{name: '1', value: '1'}]}},
			]}]));
			expect(e).not.toBeNull();

		});

		describe('allows you to set product amount', () => {

			const setBase = () => {
				return utils.save([
					{gd: {name: 's'}, ms: [
						{v: {buyPrice: 1, sellPrice: 5}, setAmount: {'2': 15}}, 
						{v: {buyPrice: 1, sellPrice: 1}, setAmount: {'1': 10}},
					]},
					{gd: {name: 'c'}, ms: [
						{v: {buyPrice: 100, sellPrice: 5}, setAmount: {'1': 30, '2': 500}},
						{v: {buyPrice: 100, sellPrice: 1}, setAmount: {'2': 120, '1': 1}},
					]},
				]);
			};

			it('sets initial on save', async () => {
				await setBase();

				expect(await utils.find()).toEqual(ea([
					eo({models: ea([
						eo({variationData: eo({buyPrice: 1, sellPrice: 5}), _amountData: {'2': 15}}),
						eo({variationData: eo({buyPrice: 1, sellPrice: 1}), _amountData: {'1': 10}}),
					])}),
					eo({models: ea([
						eo({variationData: eo({buyPrice: 100, sellPrice: 5}), _amountData: {'1': 30, '2': 500}}),
						eo({variationData: eo({buyPrice: 100, sellPrice: 1}), _amountData: {'2': 120, '1': 1}}),
					])}),
				]));
			});

			it('overrides a present amount on update, withouth disturbing other amounts', async () => {
				let b = await setBase();

				await utils.put(b.find(c => c.groupData.name === 'c')._id,
					{ms: [
						{v: {buyPrice: 100, sellPrice: 5}, setAmount: {'1': 1,}},
						// note here we explicetly set to 0, thus it should be removed
						{v: {buyPrice: 100, sellPrice: 1}, setAmount: {'2': 1, '1': 0}},
					]},
				);
	
				expect(await utils.find()).toEqual(ea([
					eo({models: ea([
						eo({variationData: eo({buyPrice: 1, sellPrice: 5}), _amountData: {'2': 15}}),
						eo({variationData: eo({buyPrice: 1, sellPrice: 1}), _amountData: {'1': 10}}),
					])}),
					eo({models: ea([
						eo({variationData: eo({buyPrice: 100, sellPrice: 5}), _amountData: {'1': 1, '2': 500}}),
						eo({variationData: eo({buyPrice: 100, sellPrice: 1}), _amountData: {'2': 1}}),
					])}),
				]));
			});

		});

		it.todo("add default groupData.type if not present");

		describe("barcode", () => {

			it.todo('If reassigning old barcodes then it takes the latest created');

			describe("manual", () => {

				it("allows same barcode on models of the same group", async () => {
					let [e, d] = await to(utils.save([
						{ms: [{bar: ['123']}, {bar: ['123']}]},
					]));
					expect(e).toBe(null);
				});

				it("errors if we post an array of productGroups with models that have equal barcode to the model in another productGroup", async () => {
					let e, d;

					[e, d] = await to(utils.save([
						{ms: [{bar: ['123']}]},
						{ms: [{bar: ['123']}]},
					]));
					expect(e).not.toBe(null);

					[e, d] = await to(utils.save([
						{ms: [{bar: ['123']}]},
						{ms: [{bar: ['124']}]},
					]));
					expect(e).toBe(null);

				});

				it("allows to set a barcode present in another group, only if the other group is deleted", async () => {
					let e, d;

					[e, d] = await to(utils.save([
						{ms: [{bar: ['123']}]},
					]));
					expect(e).toBe(null);
					const toDel = d[0]._id;

					// not deleted so error
					[e, d] = await to(utils.save([
						{ms: [{bar: ['123']}]},
					]));
					expect(e).not.toBe(null);

					// deleted so no error
					await utils.del({_id: toDel});
					[e, d] = await to(utils.save([
						{ms: [{bar: ['123']}]},
					]));
					expect(e).toBe(null);

				});

			});

			describe("automatic", () => {
				
				describe("by query param", () => {

					it("false (aka for entire group 1 barcode only)", async () => {
						let groups = await utils.save([
							{ms: [{}, {}]},
							{ms: [{}, {}, {}]},
							{ms: [{}, {}, {}]},
							{ms: [{}, {}, {}, {}]},
						], {variantsDifferentBarcode: false});
		
						const allBarcode: string[] = groups.reduce((car, g) => 
							car.push(...g.models.reduce((car2, m) => 
								car2.push(...m.infoData.barcode) && car2
							, [])) && car
						, []);
						
						// so 1 item less
						expect(ObjectUtils.removeDuplicates(ObjectUtils.cloneDeep(allBarcode)).length)
							.toEqual(groups.length);
					});

					it("eachVariant", async () => {
						let groups = await utils.save([
							{ms: [
								{vv: ['1']}, 
								{vv: ['1']}, 
								{vv: ['2']}, 
								{vv: ['3']}
							]},
							{ms: [
								{vv: ['1']}
							]}
						], {variantsDifferentBarcode: "eachVariant"});
		
						const allBarcode: string[] = groups.reduce((car, g) => 
							car.push(...g.models.reduce((car2, m) => 
								car2.push(...m.infoData.barcode) && car2
							, [])) && car
						, []);

						// 1 same variant, so 1 same barcode
						// so 1 item less
						expect(ObjectUtils.removeDuplicates(ObjectUtils.cloneDeep(allBarcode)).length)
							.toEqual(allBarcode.length - 1);
						
						// and the duplicate is the first two models
						// that have the same variant
						expect(groups[0].models[0].infoData.barcode[0])
							.toBe(groups[0].models[1].infoData.barcode[0]);
							
					});

					it("eachVariation", async () => {

						let groups = await utils.save(
							[
								{ms: [{}, {}]},
								{ms: [{}, {}, {}]},
								{ms: [{}, {}, {}]},
								{ms: [{}, {}, {}, {}]},
							], 
							{variantsDifferentBarcode: "eachVariation"} 
						);
		
						// all differny
						const allBarcodes = [];
						for (const g of groups) {
							for (const m of g.models) {
								for (const b of m.infoData.barcode) {
									expect(typeof b === 'string').toBe(true);
									expect(allBarcodes.includes(b)).toBe(false);
									allBarcodes.push(b);
								}
							}
						}

					});

				});

				it("expect the barcodes to be generated properly from the start", async () => {
					// there was a bug where the system would loop in checkAutomaticBarcodes
					// because when we first assigned the barcode we did an extra +1 on the count for each group
					// so each time we would overflow the actual prod count returned from getNextIncremental()

					// i'm using the spyOn function to test it
					// but we could test it by checking that the auto barcodes are progressive instead
					//
					// i think checkin on the function is better
					const mock = jest.spyOn(ProductGroupControllerLogic.prototype, 'checkAutomaticBarcodes' as any);

					const times = 5
					for (let i = 0; i < times; i++) {
						await utils.save([
							{ms: [{}, {}, {}, {}]},
							{ms: [{}, {}, {}, {}]},
							{ms: [{}, {}, {}, {}]},
							{ms: [{}, {}, {}, {}]},
						]);
					}
					
					// the same times as save() requests
					// because there is no conflicts
					expect(mock).toHaveBeenCalledTimes(times);
					
					mock.mockRestore();
				});

				it("changes automatic barcode if the first generated has a conflict", async () => {
					let barcode: string[];
					const save = async (bar?: string[]) => {
						const g = await utils.save([{ms: [{bar: bar ? bar: undefined}, {}]}]);
						barcode = g[0].models[1].infoData.barcode;
					}

					await dropDatabase();
					await save();
					await save();
					const expectedSecondBarcode = barcode;

					await dropDatabase();
					await save(["123", '1234']);
					await save();
					expect(barcode).toEqual(expectedSecondBarcode);

					await dropDatabase();
					await save(expectedSecondBarcode);
					await save();
					expect(barcode).not.toEqual(expectedSecondBarcode);
				});

			})

		});

		describe('tags', () => {

			it('does not allow duplicated groupData.uniqueTags', async () => {
				let e: any;
				[e] = await to(utils.save([
					{gd: {uniqueTags: ['1']}, ms: [{}, {}]},
				]));
				expect(e).toEqual(null);

				// errors on same uniqueTags usage
				[e] = await to(utils.save([
					{gd: {uniqueTags: ['1']}, ms: [{}, {}]},
				]));
				expect(e).not.toEqual(null);

				// while saving multiple models
				[e] = await to(utils.save([
					{gd: {uniqueTags: ['5']}, ms: [{}, {}]},
					{gd: {uniqueTags: ['5']}, ms: [{}, {}]},
				]));
				expect(e).not.toEqual(null);

				// while saving multiple models with non colliding ids
				[e] = await to(utils.save([
					{gd: {uniqueTags: ['5']}, ms: [{}, {}]},
					{gd: {uniqueTags: ['9']}, ms: [{}, {}]},
				]));
				expect(e).toEqual(null);

				// while saving multiple models with non colliding ids
				[e] = await to(utils.save([
					{gd: {uniqueTags: ['5']}, ms: [{}, {}]},
					{gd: {uniqueTags: ['9']}, ms: [{}, {}]},
				]));
				expect(e).not.toEqual(null);

			});

		});

	});
	
	describe("Modify", () => {

		it.todo('removes temporary fields (_returnedData, _reserveData) on put/patch');

		describe("addNewVariations()", () => {

			const fn = async (prods: Pick<Product, '_trackableGroupId' | '_id' | 'variationData'>[], replace?: boolean | 'replace' | 'add' | 'replace_withouth_movements') => {
				const items = prods
				
				const mode = replace === true || typeof replace === 'undefined' 
					? 'replace' 
					
					: typeof replace === 'string'
					? replace

					: 'add'

				await utils.controller.addNewVariations(utils.getReqObj(), prods, mode);
				return items;
			};

			it.todo('removes the _deleted models before calling replace() as to not restore them');
			
			it.todo('removes the _id field form newVariations before adding them as to not move the replaced items amounts');

			describe('if the new variation corresponds to another one, then it is replaced and removed', () => {

				it('variant', async () => {
					let m = (await utils.save([{ms: [{ v: {buyPrice: 1, sellPrice: 5}}, {v: {buyPrice: 1, sellPrice: 10}}, {v: {buyPrice: 1, sellPrice: 15}}]}]))[0].models;
					expect(m).toEqual(tt.ee([{variationData: {sellPrice: 5}}, {variationData: {sellPrice: 10}}, {variationData: {sellPrice: 15}}]));

					let p = m.find(m => m.variationData.sellPrice === 15);
					await fn([{_id: p._id, _trackableGroupId: p._trackableGroupId, variationData: {...p.variationData, sellPrice: 10}}], 'replace');
					m = (await utils.find())[0].models;
					expect(m).toEqual(tt.ee([{variationData: {sellPrice: 5}}, {variationData: {sellPrice: 10}}]));

					p = m.find(m => m.variationData.sellPrice === 10);
					await fn([{_id: p._id, _trackableGroupId: p._trackableGroupId, variationData: {...p.variationData, sellPrice: 5}}], 'replace');
					m = (await utils.find())[0].models;
					expect(m).toEqual(tt.ee([{variationData: {sellPrice: 5}}]));

					p = m.find(m => m.variationData.sellPrice === 5);
					await fn([{_id: p._id, _trackableGroupId: p._trackableGroupId, variationData: {...p.variationData, sellPrice: 10}}], 'replace');
					m = (await utils.find())[0].models;
					expect(m).toEqual(tt.ee([{variationData: {sellPrice: 10}}]));
				});

				it('simple prod', async () => {
					let m = (await utils.save([{ms: [{ v: {sellPrice: 5}}]}]))[0].models;
					expect(m).toEqual(tt.ee([{variationData: {sellPrice: 5}}]));
	
					await fn([{_id: m[0]._id, _trackableGroupId: m[0]._trackableGroupId, variationData: {...m[0].variationData, sellPrice: 10}}], 'replace');
					m = (await utils.find())[0].models;
					expect(m).toEqual(tt.ee([{variationData: {sellPrice: 10}}]));
	
					await fn([{_id: m[0]._id, _trackableGroupId: m[0]._trackableGroupId, variationData: {...m[0].variationData, sellPrice: 5}}], 'replace');
					m = (await utils.find())[0].models;
					expect(m).toEqual(tt.ee([{variationData: {sellPrice: 5}}]));
	
					await fn([{_id: m[0]._id, _trackableGroupId: m[0]._trackableGroupId, variationData: {...m[0].variationData, sellPrice: 10}}], 'replace');
					m = (await utils.find())[0].models;
					expect(m).toEqual(tt.ee([{variationData: {sellPrice: 10}}]));
				});

			})


			it('can send multiple times already present variation as newVariation', async () => {
				const done = (await utils.save([{ms: [{ v: {sellPrice: 5}}]}]))[0].models[0];
				let r = await fn([{_id: done._id, _trackableGroupId: done._trackableGroupId, variationData: {...done.variationData}}], 'add');
						expect(r[0]._id.toString()).toEqual(done._id.toString());
						r = await fn([{_id: done._id, _trackableGroupId: done._trackableGroupId, variationData: {...done.variationData}}], 'replace');
						expect(r[0]._id.toString()).toEqual(done._id.toString());
						r = await fn([{_id: done._id, _trackableGroupId: done._trackableGroupId, variationData: {...done.variationData}}], 'replace_withouth_movements');
						expect(r[0]._id.toString()).toEqual(done._id.toString());
			});

			it('should be able to send multiple same newVariation with breaking and correct id', async () => {
				const done = (await utils.save([{ms: [{ v: {sellPrice: 5}}]}]))[0].models[0];
				
				let r = await fn([
					{_id: done._id, _trackableGroupId: done._trackableGroupId, variationData: {...done.variationData, sellPrice: 6}},
					{_id: done._id, _trackableGroupId: done._trackableGroupId, variationData: {...done.variationData, sellPrice: 6}},
					{_id: done._id, _trackableGroupId: done._trackableGroupId, variationData: {...done.variationData, sellPrice: 6}},
				], 'replace_withouth_movements');

				expect(r[0]._id.toString()).not.toEqual(done._id.toString());
				expect(r[0]._id.toString()).toEqual(r[1]._id.toString());
				expect(r[0]._id.toString()).toEqual(r[2]._id.toString());

				r = await fn([
					{_id: done._id, _trackableGroupId: done._trackableGroupId, variationData: {...done.variationData, sellPrice: 8}},
					{_id: done._id, _trackableGroupId: done._trackableGroupId, variationData: {...done.variationData, sellPrice: 8}},
					{_id: done._id, _trackableGroupId: done._trackableGroupId, variationData: {...done.variationData, sellPrice: 8}},
				], 'replace');

				expect(r[0]._id.toString()).not.toEqual(done._id.toString());
				expect(r[0]._id.toString()).toEqual(r[1]._id.toString());
				expect(r[0]._id.toString()).toEqual(r[2]._id.toString());

				r = await fn([
					{_id: done._id, _trackableGroupId: done._trackableGroupId, variationData: {...done.variationData, sellPrice: 9}},
					{_id: done._id, _trackableGroupId: done._trackableGroupId, variationData: {...done.variationData, sellPrice: 9}},
					{_id: done._id, _trackableGroupId: done._trackableGroupId, variationData: {...done.variationData, sellPrice: 9}},
				], 'add');

				expect(r[0]._id.toString()).not.toEqual(done._id.toString());
				expect(r[0]._id.toString()).toEqual(r[1]._id.toString());
				expect(r[0]._id.toString()).toEqual(r[2]._id.toString());

			});

			it("replaces a variation and moves product amounts", async () => {
				let saved = await utils.save([
					{ms: [{v: {sellPrice: 1}}, {v: {sellPrice: 2}}]},
				]);

				await utils.setAmount(saved[0].models[0]._id, {'1': 10, '2': 20});

				let replaced = await fn([{
					_id: saved[0].models[0]._id, 
					_trackableGroupId: saved[0]._trackableGroupId, 
					variationData: {...saved[0].models[0].variationData, sellPrice: 10000}
				}]);

				// updated by ref
				expect(replaced[0]._id).not.toBe(saved[0].models[0]._id);

				// ensure it is replaced and the items are moved
				let groups = await utils.findOne(saved[0]._id);
				expect(groups.models).toHaveLength(2);
				expect(groups.models[1].variationData.sellPrice).toBe(10000);
				expect(groups.models[1]._approximateAmountData).toEqual({'1': 10, '2': 20});
				expect(groups.models[1]._approximateTotalAmount).toEqual(30);
			});

			it("adds a variation withouth moving product amounts", async () => {
				let saved = await utils.save([
					{ms: [{v: {buyPrice: 1}}, {v: {buyPrice: 2}}]},
				]);

				let added = await fn([{
					_id: saved[0].models[0]._id, 
					_trackableGroupId: saved[0]._trackableGroupId, 
					variationData: {...saved[0].models[0].variationData, buyPrice: 10000}
				}], false);

				// updated by ref
				expect(added[0]._id).not.toBe(saved[0].models[0]._id);

				// ensure it is replaced
				let groups = await utils.findOne(saved[0]._id);
				expect(groups.models).toHaveLength(3);
				expect(groups.models[2].variationData.buyPrice).toBe(10000);
				expect(groups.models[2]._approximateTotalAmount).toBe(0);
				expect(groups.models[2]._approximateAmountData).toEqual({});
			});

			it("works for array of mixed prods ids", async () => {

				let saved = await utils.save([
					{gd: {name: "1"}, ms: [{v: {buyPrice: 1}}, {v: {buyPrice: 2}}]},
					{gd: {name: "2"}, ms: [{v: {buyPrice: 3}}, {v: {buyPrice: 4}}, {v: {buyPrice: 5}}]},
					{gd: {name: "3"}, ms: [{v: {buyPrice: 6}}]},
				]);
				
				let replaced = await fn([
					{
						_id: saved[0].models[0]._id, 
						_trackableGroupId: saved[0]._trackableGroupId, 
						variationData: {...saved[0].models[0].variationData, buyPrice: 10000}
					},
					{
						_id: saved[1].models[0]._id, 
						_trackableGroupId: saved[1]._trackableGroupId, 
						variationData: {...saved[1].models[0].variationData, buyPrice: 30000}
					},
					{
						_id: saved[1].models[2]._id, 
						_trackableGroupId: saved[1]._trackableGroupId, 
						variationData: {...saved[1].models[2].variationData, buyPrice: 40000}
					},
					{
						_id: saved[2].models[0]._id, 
						_trackableGroupId: saved[2]._trackableGroupId, 
						variationData: {...saved[2].models[0].variationData, buyPrice: 60000}
					},
				]);


				let groups = (await utils.find()).sort((a, b) => a.groupData.name > b.groupData.name ? 1 : -1);
				expect(groups[0].models).toHaveLength(2);
				expect(groups[1].models).toHaveLength(3);
				expect(groups[2].models).toHaveLength(1);

				expect(groups[0].models[1].variationData.buyPrice).toEqual(10000);
				expect(groups[1].models[1].variationData.buyPrice).toEqual(30000);
				expect(groups[1].models[2].variationData.buyPrice).toEqual(40000);
				expect(groups[2].models[0].variationData.buyPrice).toEqual(60000);

			});

			it('allows to reference a deleted _id as base variation', async () => {
				let saved = await utils.save([
					{ms: [{v: {buyPrice: 1}}]},
				]);

				const deletedId = saved[0].models[0]._id;

				// delete the produc twith the id
				let replaced = await fn([{
					_id: deletedId, 
					_trackableGroupId: saved[0]._trackableGroupId, 
					variationData: {...saved[0].models[0].variationData, buyPrice: 10000}
				}]);

				// try to delete again
				replaced = await fn([{
					_id: deletedId, 
					_trackableGroupId: saved[0]._trackableGroupId, 
					variationData: {...saved[0].models[0].variationData, buyPrice: 10001}
				}]);

				// console.log(await utils.getRawModels());

			});

		});

		it("adds the _approxxAmount fields on creation of new variations", async () => {
			const getNewModel = () => {
				const demoGroup: Partial<ProductGroup> = {}
				utils.presave([demoGroup]); // use presave to generate the min necessary fields
				return demoGroup.models[0];
			}
			
			let groups = await utils.save([{ms: [{}]}]);
			expect(await utils.getRawModels()).toHaveLength(1);

			// test patch op
			await utils.patch(groups[0]._id, [{op: "push", path: "models", value: getNewModel()}]);
			let models = await utils.getRawModels();
			expect(models).toHaveLength(2);
			for (const m of models) {
				expect(m._approximateAmountData).toEqual({});
				expect(m._approximateTotalAmount).toEqual(0);
			}


			// test put
			const group = await utils.findOne(groups[0]._id);
			group.models.push(getNewModel());
			await utils.put(groups[0]._id, group);

			models = await utils.getRawModels();
			expect(models).toHaveLength(3);
			for (const m of models) {
				expect(m._approximateAmountData).toEqual({});
				expect(m._approximateTotalAmount).toEqual(0);
			}
		
		});

		it('keeps the same _approx data on prod modif', async () => {
			let groups = await utils.save([{ms: [{}]}]);
			let ms = await utils.getRawModels();
			await utils.setAmount(ms[0]._id, 10);
			ms = await utils.getRawModels();
			expect(ms).toHaveLength(1);
			expect(ms[0]._approximateTotalAmount).toBe(10);

			// modify with put as pactch op preserves the _approx field
			// but put does not preserve them
			// with put we can give the min required fields only fields only
			groups = await utils.find()
			groups[0].groupData.name = 'asasdasd';
			await utils.put(groups[0]._id, {
				groupData: groups[0].groupData,
				documentLocationsFilter: groups[0].documentLocationsFilter,
				models: groups[0].models.map(m => ({
					variationData: m.variationData,
					groupData: m.groupData,
					documentLocationsFilter: m.documentLocationsFilter,
					infoData: m.infoData,
				})),
			});
			let models = await utils.getRawModels();
			expect(models).toHaveLength(1);
			expect(models[0]._approximateTotalAmount).toBe(10);
		});

		describe("Product amounts/movements", () => {
			
			it('moves the p-amount ONLY if the variation change is the sellprice or variant name, else it doesnt move', async () => {
				
				// set start data
				let models = (await utils.save([{ms: [
					{v: {buyPrice: 10, sellPrice: 10, variants: [{name: 'a', value: '1'}]}}, 
					{v: {buyPrice: 15, sellPrice: 15, variants: [{name: 'a', value: '2'}]}},
				]}]))[0].models;
				await utils.setAmount(models[0]._id, 10);
				await utils.setAmount(models[1]._id, 12);

				// ensure amounts are present
				models = (await utils.find())[0].models;
				expect(models).toEqual(ea([
					eo({_totalAmount: 10, variationData: eo({buyPrice: 10, sellPrice: 10, variants: ea([eo({name: 'a', value: '1'})])})}),
					eo({_totalAmount: 12, variationData: eo({buyPrice: 15, sellPrice: 15, variants: ea([eo({name: 'a', value: '2'})])})}),
				]));

				// update a field that MOVES the product amounts
				models = ObjectUtils.cloneDeep(models);
				models.find(m => m.variationData.sellPrice === 10).variationData.sellPrice = 199;
				models.find(m => m.variationData.sellPrice === 15).variationData.sellPrice = 599;

				await utils.put(models[0]._trackableGroupId, {models});

				// expect moved amounts
				models = (await utils.find())[0].models;
				expect(models).toEqual(ea([
					eo({_totalAmount: 10, variationData: eo({buyPrice: 10, sellPrice: 199, variants: ea([eo({name: 'a', value: '1'})])})}),
					eo({_totalAmount: 12, variationData: eo({buyPrice: 15, sellPrice: 599, variants: ea([eo({name: 'a', value: '2'})])})}),
				]));

				// update a field that MOVES the product amounts (variant names)
				models = ObjectUtils.cloneDeep(models);
				models.find(m => m.variationData.variants[0].name === 'a').variationData.variants[0].name = 'X';
				models.find(m => m.variationData.variants[0].name === 'a').variationData.variants[0].name = 'X';

				await utils.put(models[0]._trackableGroupId, {models});

				// expect moved amounts
				models = (await utils.find())[0].models;
				expect(models).toEqual(ea([
					eo({_totalAmount: 10, variationData: eo({buyPrice: 10, sellPrice: 199, variants: ea([eo({name: 'X', value: '1'})])})}),
					eo({_totalAmount: 12, variationData: eo({buyPrice: 15, sellPrice: 599, variants: ea([eo({name: 'X', value: '2'})])})}),
				]));


				// update a field that DOES NOT MOVES the product amounts
				models = ObjectUtils.cloneDeep(models);
				models.find(m => m.variationData.buyPrice === 10).variationData.buyPrice = 199;
				models.find(m => m.variationData.buyPrice === 15).variationData.buyPrice = 599;

				await utils.put(models[0]._trackableGroupId, {models});

				// expect remainings amounts
				models = (await utils.find())[0].models;
				expect(models).toEqual(ea([
					eo({_deleted: expect.anything(), _totalAmount: 10, variationData: eo({buyPrice: 10, sellPrice: 199, variants: ea([eo({name: 'X', value: '1'})])})}),
					eo({_deleted: expect.anything(), _totalAmount: 12, variationData: eo({buyPrice: 15, sellPrice: 599, variants: ea([eo({name: 'X', value: '2'})])})}),
					eo({_totalAmount: 0, variationData: eo({buyPrice: 199, sellPrice: 199, variants: ea([eo({name: 'X', value: '1'})])})}),
					eo({_totalAmount: 0, variationData: eo({buyPrice: 599, sellPrice: 599, variants: ea([eo({name: 'X', value: '2'})])})}),
				]));
				
			});

			it("moves the p-amount from the old variation to the new based on the _id of the model regardless if the locations of the amounts are visible to the user or not", async () => {

				const mock = jest.spyOn(ProductMovementController.prototype, 'saveToDb');
				const amHm1 = {['1']: 1, ['2']: 2, ['3']: 3};
				const amHm2 = {['x']: 1, ['z']: 2, ['q']: 1};
				const limitedReqLocs = utils.getReqObj({authzString: generateAuthzString({
					allLocs: ["1", "2", "3", "x", "z", "q"],
					userLocs: ['x'],
				})})

				// create products and amounts
				let models = (await utils.save([{ms: [
					{v: {sellPrice: 12}}, 
					{v: {sellPrice: 5555}}
				]}]))[0].models;
				await utils.setAmount(models[0]._id, amHm1);
				await utils.setAmount(models[1]._id, amHm2);
				expect(mock).toHaveBeenCalledTimes(2);

				// ensure amounts are present
				models = (await utils.find())[0].models;
				expect(models.find(m => m.variationData.sellPrice === 12)).toEqual(expect.objectContaining({
					_approximateTotalAmount: 6, _totalAmount: 6,
					_approximateAmountData: amHm1, _amountData: amHm1,
				}));
				expect(models.find(m => m.variationData.sellPrice === 5555)).toEqual(expect.objectContaining({
					_approximateTotalAmount: 4, _totalAmount: 4,
					_approximateAmountData: amHm2, _amountData: amHm2,
				}));
				
				// update 
				// items
				models = ObjectUtils.cloneDeep(models);
				models.find(m => m.variationData.sellPrice === 12).variationData.sellPrice = 1;
				models.find(m => m.variationData.sellPrice === 5555).variationData.sellPrice = 5;
				// we manually pass the object, as the limitedreqobject does not see the object in the db
				// as the location is not accessibile
				let beObj = await utils.findOne(models[0]._trackableGroupId);
				await utils.put(models[0]._trackableGroupId, {models}, {reqObj: limitedReqLocs, objFromBe: beObj});
				expect(mock).toHaveBeenCalledTimes(3);

				// expect moved amounts
				models = (await utils.find())[0].models;
				expect(models.find(m => m.variationData.sellPrice === 1)).toEqual(expect.objectContaining({
					_approximateTotalAmount: 6, _totalAmount: 6,
					_approximateAmountData: amHm1, _amountData: amHm1,
				}));
				expect(models.find(m => m.variationData.sellPrice === 5)).toEqual(expect.objectContaining({
					_approximateTotalAmount: 4, _totalAmount: 4,
					_approximateAmountData: amHm2, _amountData: amHm2,
				}));
				

				// ensure the deleted products have nothing left
				const allModels = await utils.getRawModels();
				await new ProductMovementController().calculateAmountInProdsForUser(utils.getReqObj(), allModels);
				const dels = allModels.filter(m => m._deleted);
				expect(dels).toHaveLength(2);
				for (const d of dels) {
					expect(d).toEqual(expect.objectContaining({
						_approximateTotalAmount: 0, _totalAmount: 0,
						_approximateAmountData: {}, _amountData: {},
					}));
				}

				mock.mockRestore();
			});

			describe('incoming movement', () => {

				it('moves the p-amount in incoming state and updates the generated from models also', async () => {
					const controller = [utils.InternalOrder, utils.TransferOrder];
					for (const c of controller) {
						// set start data
						let models = (await utils.save([{ms: [
							{v: {sellPrice: 1}}, 
							{v: {sellPrice: 2}},
						]}]))[0].models;
		
						const save: PartialPricedRow = {
							status: 1, 
							physicalLocation: '1',
							ps: [
								{id: models[0]._id, amount: 1}, 
								{id: models[1]._id, amount: 2}
							]
						};
						
						if (c === utils.TransferOrder) {
							(save as any as TransferOrder).transferOriginLocationId = '2';
						}

						await c.save([save]);
		
						// ensure amounts are present
						models = (await utils.find())[0].models;
						expect(models).toEqual(tt.ee([
							{variationData: {sellPrice: 1}, _incomingData: {'1': 1}},
							{variationData: {sellPrice: 2}, _incomingData: {'1': 2}},
						]));
						
						// update a field that MOVES the product amounts
						models = ObjectUtils.cloneDeep(models);
						models.find(m => m.variationData.sellPrice === 1).variationData.sellPrice = 199;
						models.find(m => m.variationData.sellPrice === 2).variationData.sellPrice = 599;
						await utils.put(models[0]._trackableGroupId, {models});

						// ensure same amounts are present
						models = (await utils.find())[0].models;
						expect(models).toEqual(tt.ee([
							{variationData: {sellPrice: 199}, _incomingData: {'1': 1}},
							{variationData: {sellPrice: 599}, _incomingData: {'1': 2}},
						]));

						// ensure the ref was also updated in the priced models
						const pricedModelsWithRef = await c.find();
						expect(pricedModelsWithRef).toEqual(tt.ee([{
							list: [{products: [
								{item: {id: models[0]._id.toString()}, amount: 1},
								{item: {id: models[1]._id.toString()}, amount: 2},
							]}]
						}]));

						await tt.dropDatabase();
					}
				});
				
				// customer order can create transfer order, so we need to ensure we dont update transfer order which are generated from somethings else
				// theoretically even sale model can create transfer order etc
				it('does not update TransferOrderModel if they are _generatedFrom', async () => {
					// set start data
					let models = (await utils.save([{ms: [
						{v: {sellPrice: 1}}, 
					]}]))[0].models;
					const initialId = models[0]._id.toString();
	
					let cs = await utils.CustomerOrder.save([{
						status: 1, 
						physicalLocation: '1',
						ps: [{id: models[0]._id, amount: 1, tr: {'2': 1}}],
					}]);

					expect(cs[0].list[0].products[0]).toEqual(tt.ee({item: {id: initialId}, amount: 1, transfer: {'2': 1}}));
					
					// update a field that MOVES the product amounts
					models = ObjectUtils.cloneDeep(models);
					models[0].variationData.sellPrice = 100;
					await utils.put(models[0]._trackableGroupId, {models});
					models = (await utils.find())[0].models;

					// ensure change has been done
					let newId = models[0]._id;
					expect(newId).not.toEqual(initialId);
					
					// expect same id in the customer order
					cs = await utils.CustomerOrder.find();
					expect(cs[0].list[0].products[0]).toEqual(tt.ee({item: {id: initialId}, amount: 1, transfer: {'2': 1}}));

					// expect also the same id in the transfer order created
					let transferOrders = await utils.TransferOrder.find();
					expect(transferOrders[0].list[0].products[0]).toEqual(tt.ee({item: {id: initialId}, amount: 1}));
				});

			});

		});


	});

});

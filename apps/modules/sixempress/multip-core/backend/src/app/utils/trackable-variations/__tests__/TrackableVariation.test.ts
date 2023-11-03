import { TrackableVariationController } from "../TrackableVariation.controller";
import { MultipleModelTrackableVariation, TrackableVariation } from '../TrackableVariation';
import { MongoUtils, IVerifiableItemDtd, CS, PatchOperation, ObjectUtils, AbstractDbItemController, DeleteOptions, IVerifiableItemDtdStatic, } from "@sixempress/main-be-lib";
import { ModelClass } from '@utils/enums/model-class.enum';
import { generateRequestObject, dropDatabase, testSlug, FetchableField } from "../../../tests/setupTests";
import { ObjectId } from "mongodb";
import to from "await-to-js";

interface Model extends TrackableVariation<any> {
	groupData: any;
	variationData: any;
	infoData: any;
	models?: Partial<Model>[];
}

interface MultiModel extends MultipleModelTrackableVariation<any, any> {
	groupData: any;
	variationData: any;
	infoData: any;
	models: Partial<Model>[];
}

const utils = (() => {
	class ModelTest extends TrackableVariationController<Model> {
		modelClass = "ModelTest" as any;
		collName = "CollectionTest" as any;
		bePath = "PathTest" as any;

		requireDocumentLocation = false;

		Attributes = { view: 1, add: 1, modify: 1, delete: 1, };

		dtd: IVerifiableItemDtdStatic<Model> = {
			groupData: { type: ['any'], required: true },
			variationData: { type: ['any'], required: false },
			infoData: { type: ['any'], required: false },
			models: { type: [Array], required: false, arrayDef: {type: ['any']} },
		};

		setMultiMode(mode: boolean) {
			this.modelIsMultiple = mode;
		}
	}

	return {
		controller: new ModelTest(),
		
		getReqObj: () => generateRequestObject(),

		presaveMulti: (i: Partial<MultiModel>[]) => {
			utils.presave(i);
			
			for (const o of i) {
				o.models = o.models || [{}];
				
				for (const x of o.models) {
					if (!x.variationData) {
						x.variationData = {random: Math.random()}
					}
				}

				utils.presave(o.models);
				
			}
		},
		
		presave: (i: Partial<Model>[]) => {
			for (const o of i) {
				o.groupData = o.groupData || { field: "x" };
				o.variationData = o.variationData || { field: "x" };
				o.infoData = o.infoData || {};
				o.documentLocationsFilter = o.documentLocationsFilter || ["1"];
			}
		},

		saveMulti: async (i: Partial<MultiModel>[]) => {
			utils.controller.setMultiMode(true);
			utils.presaveMulti(i);
			const tor = await utils.controller.saveToDb(utils.getReqObj(), i as any);
			utils.controller.setMultiMode(false);
			return tor.ops;
		},

		save: async (i: Partial<Model>[]): Promise<Model[]> => {
			utils.presave(i);
			const ops = (await utils.controller.saveToDb(utils.getReqObj(), i as any));
			return (await utils.getModels({_id: {$in: Object.values(ops.insertedIds)}}));
		},

		patchMulti: async (id: string | ObjectId, ops: PatchOperation<any>[]) => {
			utils.controller.setMultiMode(true);

			const beObj = await utils.controller.findOneForUser(utils.getReqObj(), {_id: id});
			const res = await utils.controller.patchSingle(utils.getReqObj(), beObj, ops);
			
			utils.controller.setMultiMode(false);
		},

		patch: async (id: string | ObjectId, ops: PatchOperation<any>[]) => {
			const beObj = (await utils.getModels({_id: new ObjectId(id.toString())}))[0];
			const res = await utils.controller.patchSingle(utils.getReqObj(), beObj, ops);
		},

		putMulti: async (id: string | ObjectId, i: Partial<MultiModel>) => {
			utils.controller.setMultiMode(true);

			utils.presaveMulti([i]);
			const ops = (await utils.controller.replaceItem__READ_DESCRIPTION(utils.getReqObj(), {_id: new ObjectId(id.toString())}, i as Model));
			
			utils.controller.setMultiMode(false);
			return await utils.findMulti({_id: new ObjectId(id.toString())});
		},

		put: async (id: string | ObjectId, i: Partial<Model>) => {
			utils.presave([i]);
			const ops = (await utils.controller.replaceItem__READ_DESCRIPTION(utils.getReqObj(), {_id: new ObjectId(id.toString())}, i as Model));
			return await utils.getModels({_id: new ObjectId(id.toString())});
		},

		findMulti: async (f?): Promise<MultiModel[]> => {
			utils.controller.setMultiMode(true);
			const tor = await utils.controller.findForUser(utils.getReqObj(), f);
			utils.controller.setMultiMode(false);
			return tor as any;
		},

		find: async (f?): Promise<Model[]> => {
			const tor = await utils.controller.findForUser(utils.getReqObj(), f);
			return tor as any;
		},

		deleteMulti: async (f, opts?: DeleteOptions): Promise<any> => {
			utils.controller.setMultiMode(true);
			const tor = await utils.controller.deleteForUser(utils.getReqObj(), f, opts);
			utils.controller.setMultiMode(false);
			return tor;
		},

		delete: async (f, opts?: DeleteOptions): Promise<any> => {
			return utils.controller.deleteForUser(utils.getReqObj(), f, opts);
		},

		getModels: (f?): Promise<Model[]> => {
			return CS.db.db(testSlug).collection(utils.controller.collName).find(f).toArray();
		},

		dropModels: (): Promise<any> => {
			return CS.db.db(testSlug).collection(utils.controller.collName).deleteMany({})
		},

	};
})();

beforeEach(async () => {
	await dropDatabase();
	utils.controller.setMultiMode(false);
});

describe("TrackableVariation", () => {

	describe("save", () => {

		// we weren't using `this.getGlobalFields()` but just checking manually each field lol
		it.todo('respects the getGlobalFields() function when remapping old delted items to check if they should be updated too');

		it("single", async () => {
			expect(await utils.getModels()).toHaveLength(0);
			let res = await utils.save([{
				groupData: { field: "1" },
				variationData: { field: "1" },
			}, {
				groupData: { field: "2" },
				variationData: { field: "2" },
				infoData: { field: "2" }
			}]);
			expect(await utils.getModels()).toHaveLength(2);
	
			expect(res[0]._trackableGroupId).not.toBe(undefined);
			expect(typeof res[0]._trackableGroupId === 'string').toBe(true);
			expect(res[0]._trackableGroupId.match(MongoUtils.objectIdRegex)).toBeTruthy();
	
			expect(res[1]._trackableGroupId).not.toBe(undefined);
			expect(typeof res[1]._trackableGroupId === 'string').toBe(true);
			expect(res[1]._trackableGroupId.match(MongoUtils.objectIdRegex)).toBeTruthy();
	
			expect(res[0]._trackableGroupId).not.toBe(res[1]._trackableGroupId);
		});

		it("multi", async () => {
			expect(await utils.getModels()).toHaveLength(0);
			await utils.saveMulti([{groupData: {field: "1"}, models: [{variationData: {f: 1}}, {variationData: {f: 2}}]}, {groupData: {field: "2"}, models: [{variationData: {f: 3}}, {variationData: {f: 4}}]}])
			let models = await utils.getModels();
			expect(models).toHaveLength(4);
			
			const first = models.filter(m => m.groupData.field === '1');
			expect(first).toHaveLength(2);
			first.forEach(f => expect(f._trackableGroupId).toBe(first[0]._trackableGroupId));

			const second = models.filter(m => m.groupData.field === '2');
			expect(second).toHaveLength(2);
			second.forEach(f => expect(f._trackableGroupId).toBe(second[0]._trackableGroupId));

			// filter to ensure all _id are different
			const allIds = [];
			for (const m of models) {
				if (!allIds.includes(m._id.toString())) {
					allIds.push(m._id.toString());
				}
			}
			expect(allIds).toHaveLength(4);

		});

		it("multi checks for uniquess of variationData", async () => {
			let e, d;
			
			[e, d] = await to(utils.saveMulti([{models: [{variationData: {field: '1'}}, {variationData: {field: '1'}}]}]));
			expect(e).not.toBeNull();
			[e, d] = await to(utils.saveMulti([{models: [{variationData: {field: {x: [{a: 1}, 2]}}}, {variationData: {field: {x: [{a: 1}, 2]}}}]}]));
			expect(e).not.toBeNull();

			[e, d] = await to(utils.saveMulti([{models: [{variationData: {field: '1'}}, {variationData: {field: "2"}}]}]));
			expect(e).toBeNull();
			[e, d] = await to(utils.saveMulti([
				{models: [{variationData: {field: '1'}}, {variationData: {field: "2"}}]},
				{models: [{variationData: {field: '1'}}, {variationData: {field: "2"}}]},
			]));
			expect(e).toBeNull();
		});

		it("multi requires minLength array 1", async () => {
			let e, d;

			[e, d] = await to(utils.saveMulti([{models: []}]));
			expect(e).not.toBeNull();

			[e, d] = await to(utils.saveMulti([{models: [{}]}]));
			expect(e).toBeNull();

			// update
			let id = d[0]._id;
			[e, d] = await to(utils.putMulti(id, {models: []}));
			expect(e).not.toBeNull();

			[e, d] = await to(utils.putMulti(id, {models: [{}]}));
			expect(e).toBeNull();

		});

		it("multi forces the group data unto childrens", async () => {
			let groups = await utils.saveMulti([
				{groupData: {asd: 1}, models: [{groupData: {asd: 2}}, {groupData: {asd: 3}}]},
				{documentLocation: "1", models: [{documentLocation: "asdasd"}, {documentLocation: "xczxczxc"}]},
				{documentLocationsFilter: ["1"], models: [{documentLocationsFilter: ["1asddddd"]}, {documentLocationsFilter: ["1231231"]}]},
			]);

			for (const gs of groups) {
				for (const m of gs.models) {
					expect(m.groupData).toEqual(gs.groupData);
					expect(m.documentLocationsFilter).toEqual(gs.documentLocationsFilter);
					expect(m.documentLocation).toEqual(gs.documentLocation);
					expect(m._trackableGroupId).toEqual(gs._trackableGroupId);
					
					// just to be safe ensure all global Fields are here
					// this line is not that useful, the lines above SHOULD NOT
					// be replaced with this
					for (const f of utils.controller['getGlobalFields']()) {
						expect(m[f]).toEqual(gs[f]);
					}
				}
			}

		});

	});

	describe("delete", () => { 

		it("single, just calls the parents", async () => {
			const mock = jest.spyOn(AbstractDbItemController.prototype, 'deleteForUser');
			
			let res = await utils.save([{}, {}]);
			await utils.delete({asddasd: 1}, {opts_asd: 1} as any);
			expect(mock).toHaveBeenLastCalledWith(expect.anything(), {asddasd: 1}, {opts_asd: 1});

			mock.mockRestore();
		});

		it("sets the _groupDeleted field", async () => {
			let saved = await utils.saveMulti([{models: [{}, {}]}, {models: [{}, {}, {}]}]);
			let models = await utils.getModels();
			expect(models).toHaveLength(2 + 3);
			expect(models.filter(p => p._groupDeleted)).toHaveLength(0);
			
			await utils.deleteMulti({_id: saved[0]._trackableGroupId.toString()});
			models = await utils.getModels();
			expect(models).toHaveLength(2 + 3);
			expect(models.filter(p => p._groupDeleted)).toHaveLength(2);
			expect(models.filter(p => p._groupDeleted && p._trackableGroupId === saved[0]._trackableGroupId)).toHaveLength(2);
		});

		it("deletes the group of a model, if we target a field of a single model", async () => {
			let saved = await utils.saveMulti([
				{groupData: {name: "s"}, models: [{}, {}]}, 
				{groupData: {name: "s"}, models: [{}, {}]},
				{groupData: {name: "s"}, models: [{}, {}]},
			]);

			let models = await utils.getModels();
			expect(models).toHaveLength(2 * 3);
			expect(models.filter(p => p._groupDeleted)).toHaveLength(0);
			
			await utils.deleteMulti({"groupData.name": "s"});
			models = await utils.getModels();
			expect(models).toHaveLength(2 * 3);
			// ensure it deletes one of the two groups
			expect(models.filter(p => p._groupDeleted)).toHaveLength(2);

			// delete all items
			await utils.deleteMulti({"groupData.name": "s"}, {deleteMulti: true});
			models = await utils.getModels();
			expect(models).toHaveLength(2 * 3);
			expect(models.filter(p => p._groupDeleted)).toHaveLength(2 * 3);


			// restore the deleted items, to delete the completely
			await utils.controller.getCollToUse(utils.getReqObj()).updateMany({}, {$unset: {_deleted: "", _groupDeleted: ""}});
			models = await utils.getModels();
			expect(models).toHaveLength(2 * 3);
			expect(models.filter(p => p._groupDeleted)).toHaveLength(0);

			// delete all items
			await utils.deleteMulti({"groupData.name": "s"}, {completeDelete: true});
			models = await utils.getModels();
			expect(models).toHaveLength(2 * 2);
			expect(models.filter(p => p._groupDeleted)).toHaveLength(0);

			// delete all items
			await utils.deleteMulti({"groupData.name": "s"}, {completeDelete: true, deleteMulti: true});
			models = await utils.getModels();
			expect(models).toHaveLength(0);
		});
	
	});

	describe("get", () => {

		describe('modifies filters fields', () => {

			it.todo('_deleted => _groupDeleted');

			it.todo('_id => _trackableGroupId');

		});

		it("single returns only non deleted item", async () => {
			let res = await utils.save([
				{variationData: {f: 1}},
				{variationData: {f: 2}},
				{variationData: {f: 3}},
			]);

			let models = await utils.find();
			expect(models).toHaveLength(3);
			
			await utils.patch(res[0]._id, [{op: "set", path: "variationData.f", value: 10}]);
			models = await utils.find();
			expect(models).toHaveLength(3);
			expect(models.filter(f => f.variationData.f === 1)).toHaveLength(0);
			expect(models.filter(f => f.variationData.f === 10)).toHaveLength(1);

			await utils.patch(res[2]._id, [{op: "set", path: "variationData.f", value: 10}]);
			models = await utils.find();
			expect(models).toHaveLength(3);
			expect(models.filter(f => f.variationData.f === 1)).toHaveLength(0);
			expect(models.filter(f => f.variationData.f === 3)).toHaveLength(0);
			expect(models.filter(f => f.variationData.f === 10)).toHaveLength(2);
		});

		it("multi returns only non deleted models", async () => {
			let saved = await utils.saveMulti([{models: [{}, {}, {}]}]);
			expect((await utils.findMulti())[0].models).toHaveLength(3);

			await utils.putMulti(saved[0]._id, {models: [{}, {}]})
			expect((await utils.findMulti())[0].models).toHaveLength(2);

			await utils.putMulti(saved[0]._id, {models: [{}]})
			expect((await utils.findMulti())[0].models).toHaveLength(1);

			await utils.putMulti(saved[0]._id, {models: [{}, {}, {}, {}, {}]})
			expect((await utils.findMulti())[0].models).toHaveLength(5);

			await utils.putMulti(saved[0]._id, {models: [{}, {}]})
			expect((await utils.findMulti())[0].models).toHaveLength(2);
		});

		it("multi returns only non deleted groups", async () => {
			let saved = await utils.saveMulti([
				{models: [{}]},
				{models: [{}, {}]},
				{models: [{}]},
			]);
			expect((await utils.findMulti())).toHaveLength(3);

			await utils.deleteMulti({_id: saved[2]._id});
			expect((await utils.findMulti())).toHaveLength(2);

			await utils.deleteMulti({_id: saved[1]._id});
			expect((await utils.findMulti())).toHaveLength(1);

			await utils.deleteMulti({_id: saved[2]._id});
			expect((await utils.findMulti())).toHaveLength(1);

			await utils.deleteMulti({_id: saved[0]._id});
			expect((await utils.findMulti())).toHaveLength(0);
		});

		describe("variation/infodata partial fields", () => {
			const supId = new ObjectId().toString();

			const setBaseItems = async (keepOldObjects?: boolean) => {
		
				if (keepOldObjects !== true) { await utils.controller.getRawCollection(testSlug).deleteMany({}); }
			
				const prods: Partial<MultiModel>[] = [
					// difference in buyPrice (top field)
					{
						groupData: { name: "prod1" },
						models: [{ variationData: {
							buyPrice: 1, 
							sellPrice: 1, 
							supplier: new FetchableField(supId, ModelClass.Supplier), 
							variants: [],
						}, }, { variationData: {
							buyPrice: 2, 
							sellPrice: 1, 
							supplier: new FetchableField(supId, ModelClass.Supplier), 
							variants: [],
						}, }, { variationData: {
							buyPrice: 3, 
							sellPrice: 1, 
							supplier: new FetchableField(supId, ModelClass.Supplier),
							variants: [],
						}, }],
					},
			
					// variants only differ
					{
						groupData: { name: "prod2" },
						models: [{ variationData: {
							buyPrice: 1, 
							sellPrice: 1, 
							variants: [
								{name: "a", value: "a"},
								{name: "b", value: "b"},
							]},
						}, { variationData: {
							buyPrice: 1, 
							sellPrice: 1, 
							variants: [
								{name: "a", value: "a"},
								{name: "b", value: "c"},
							]}, 
							
						}, { variationData: {
							buyPrice: 1, 
							sellPrice: 1, 
							variants: [
								{name: "a", value: "r"},
								{name: "b", value: "s"},
							]},
						}],
					},
			
					// only the second product is kept, the rest is deleted
					// note each supplier._id is different
					{
						groupData: { name: "prod3" },
						models: [{ variationData: {
							buyPrice: 1,
							sellPrice: 1, 
							supplier: new FetchableField(new ObjectId().toString(), ModelClass.Supplier), 
						}, }, { variationData: {
							buyPrice: 2, 
							sellPrice: 1, 
							supplier: new FetchableField(supId, ModelClass.Supplier)
						}, }, { variationData: {
							buyPrice: 3, 
							sellPrice: 1, 
							supplier: new FetchableField(new ObjectId().toString(), ModelClass.Supplier)
						} }],
					},
			
			
					// deep objects are eqaual
					{
						groupData: { name: "prod4" },
						models: [{
							variationData: {buyPrice: 1, sellPrice: 1, variants: [{a: 1}, {arr: ['1', 'b']}]},
						}, {
							variationData: {buyPrice: 2, sellPrice: 1, variants: [{a: 1}, {arr: ['1', 'b']}]},
						}, {
							variationData: {buyPrice: 3, sellPrice: 1, variants: [{a: 1}, {arr: ['1', 'b']}]},
						}],
					},
			
			
					// all variationdata is different
					{
						groupData: { name: "prod5" },
						models: [{
							variationData: {buyPrice: 1, sellPrice: 1, supplier: new FetchableField(new ObjectId().toString(), ModelClass.Supplier), variants: [{name: "a", value: "a"}]},
						}, {
							variationData: {buyPrice: 2, sellPrice: 2, supplier: new FetchableField(new ObjectId().toString(), ModelClass.Supplier), variants: [{name: "a", value: "b"}]},
						}, {
							variationData: {buyPrice: 3, sellPrice: 3, supplier: new FetchableField(new ObjectId().toString(), ModelClass.Supplier), variants: [{name: "a", value: "c"}]},
						}]
					},
			
			
				];
	
				// copy variation as to the the infoData field too
				for (const p of prods) {
					for (const m of p.models) {
						m.infoData = ObjectUtils.cloneDeep(m.variationData);
					}
				}
				await utils.saveMulti(prods);
		
				const partialDelete = (await utils.findMulti({"groupData.name": "prod3"}))[0];
				partialDelete.models = partialDelete.models.splice(1, 1);
				await utils.putMulti(partialDelete._id, partialDelete);
			}

			it("test", async () => {
				await setBaseItems();
				let groups = await utils.findMulti();

				let g = groups.find(g => g.groupData.name === 'prod1');
				expect(g.variationData).toEqual(g.infoData);
				expect(g.variationData).toEqual({
					sellPrice: 1,
					supplier: new FetchableField(supId, ModelClass.Supplier),
					variants: [],
				});

				g = groups.find(g => g.groupData.name === 'prod2');
				expect(g.variationData).toEqual(g.infoData);
				expect(g.variationData).toEqual({
					buyPrice: 1,
					sellPrice: 1,
				});

				// other two products are deleted
				g = groups.find(g => g.groupData.name === 'prod3');
				expect(g.variationData).toEqual(g.infoData);
				expect(g.variationData).toEqual({
					buyPrice: 2,
					sellPrice: 1,
					supplier: new FetchableField(supId, ModelClass.Supplier),
				});

				// deep object equal
				g = groups.find(g => g.groupData.name === 'prod4');
				expect(g.variationData).toEqual(g.infoData);
				expect(g.variationData).toEqual({
					sellPrice: 1,
					variants: [{a: 1}, {arr: ['1', 'b']}]
				});

				// all different data
				g = groups.find(g => g.groupData.name === 'prod5');
				expect(g.variationData).toEqual(g.infoData);
				expect(g.variationData).toEqual({
				});

			});

		});

	})

	describe("modify", () => {
	
		it.todo('overrides childs global field if present, if not present deletes childs global fields');

		it.todo('if a created/restored variation in input has an extra field then it is kept, used for _metaData and _aproxx etc..');

		it("nothing change on same models", async () => {
			let res = await utils.saveMulti([{models: [{variationData: {a: 1}}, {variationData: {a: 2}}]}]);
			const stored = ObjectUtils.cloneDeep( await utils.findMulti({}) );
			
			await utils.putMulti(res[0]._id, {models: [{variationData: {a: 1}}, {variationData: {a: 2}}]});
			const newObj = ObjectUtils.cloneDeep( await utils.findMulti({}) );
			
			expect(newObj).toEqual(stored);
		});

		it("calls postSave", async () => {
			const postMock = utils.controller['postUpdate'] = jest.fn().mockReturnValue(new Promise<void>((r, j) => r()));
			let res = await utils.saveMulti([{}]);
			expect(postMock).toHaveBeenCalledTimes(0);

			await utils.putMulti(res[0]._id, {});
			expect(postMock).toHaveBeenCalledTimes(1);
		});

		it("changin group fields modifies models", async () => {
			let res = await utils.saveMulti([
				{models: [{variationData: {field: '1'}}, {variationData: {field: "2"}}]},
				{models: [{variationData: {field: '1'}}, {variationData: {field: "2"}}, {variationData: {field: "3"}}]},
			]);
			expect(res).toHaveLength(2);
			expect(await utils.getModels()).toHaveLength(5);

			expect((await utils.getModels()).filter(m => m.groupData.field === 'ABSSOSO')).toHaveLength(0);
			await utils.patchMulti(res[0]._id, [{op: "set", path: "groupData.field", value: "ABSSOSO"}]);
			expect((await utils.getModels()).filter(m => m.groupData.field === 'ABSSOSO')).toHaveLength(2);

			expect((await utils.getModels()).filter(m => m.documentLocationsFilter[0] === "asdasd")).toHaveLength(0);
			await utils.patchMulti(res[0]._id, [{op: "set", path: "documentLocationsFilter", value: ["asdasd"]}]);
			expect((await utils.getModels()).filter(m => m.documentLocationsFilter[0] === "asdasd")).toHaveLength(2);

			expect((await utils.getModels()).filter(m => m.documentLocation === "asdasd")).toHaveLength(0);
			await utils.patchMulti(res[0]._id, [{op: "set", path: "documentLocation", value: "asdasd"}]);
			expect((await utils.getModels()).filter(m => m.documentLocation === "asdasd")).toHaveLength(2);

		});
		
		describe("single point of logic", () => {
	
			it("treats multiModel and singleModel with the same logic", async () => {
				const mock = jest.spyOn(utils.controller, 'unpackUpdateTargets' as any);
				const fn = jest.spyOn(utils.controller, 'createUpdatedItems' as any);
	
				let res = await utils.saveMulti([{}]);
				mock.mockReturnValueOnce([{...res[0].models[0], variationData: {_quack: 3}}]);
				await utils.patchMulti(res[0]._trackableGroupId, [{op: "set", path: "groupData.field", value: "3"}]);
				expect(await utils.getModels({"variationData._quack": 3})).toHaveLength(1);
	
				res = await utils.save([{}]);
				mock.mockReturnValueOnce([{...res[0], variationData: {qqqaaa: 3}}]);
				await utils.patch(res[0]._id, [{op: "set", path: "groupData.field", value: "3"}]);
				expect(await utils.getModels({"variationData.qqqaaa": 3})).toHaveLength(1);
	
				mock.mockRestore();
			});
	
		});
	
	
		/**
		 * As we know that patch calls replace, we can test either with patches or puts, it's the same
		 * but i use patch as they are faster to write
		 * 
		 * also we know that the multiModel and singleModel objects are treated the same
		 */
	
		describe("doesn't add any model to db when model values changes that is not variationData", () => {
	
			it("single", async () => {
				let res = await utils.save([{}]);
				expect(await utils.getModels()).toHaveLength(1);
		
				// pathc groupData
				await utils.patch(res[0]._id, [{op: "set", path: "groupData.field", value: "chang_val"}]);
				
				let models = await utils.getModels();
				expect(models).toHaveLength(1);
		
				// ensure the patch is appplied
				expect(res[0].groupData.field).not.toBe("chang_val");
				expect(models[0].groupData.field).toBe("chang_val");
		
		
				// pathc infoData
				await utils.patch(res[0]._id, [{op: "set", path: "infoData.field", value: "chang_val"}]);
				
				models = await utils.getModels();
				expect(models).toHaveLength(1);
		
				// ensure the patch is appplied
				expect(res[0].infoData.field).not.toBe("chang_val");
				expect(models[0].infoData.field).toBe("chang_val");
			});
	
			it("multi", async () => {
				let res = await utils.saveMulti([{models: [{}, {}]}]);
				expect(await utils.getModels()).toHaveLength(2);
	
				await utils.patchMulti(res[0]._id, [{op: "set", path: "groupData.field", value: "chang_val"}]);
				let models = await utils.getModels();
				expect(models).toHaveLength(2);
	
				// ensure the patch is appplied
				expect(res[0].groupData.field).not.toBe("chang_val");
				expect(models[0].groupData.field).toBe("chang_val");
				expect(models[1].groupData.field).toBe("chang_val");

				// infoData
				await utils.patchMulti(res[0]._id, [{op: "set", path: "models.0.infoData.field", value: "chang_val"}]);
				models = await utils.getModels();
				expect(models).toHaveLength(2);
	
				// ensure the patch is appplied
				expect(res[0].groupData.field).not.toBe("chang_val");
				expect(models[0].groupData.field).toBe("chang_val");
				expect(models[1].groupData.field).toBe("chang_val");

				expect(res[0].models[0].infoData.field).not.toBe("chang_val");
				expect(models[0].infoData.field).toBe("chang_val");
				expect(models[1].infoData.field).not.toBe("chang_val");
			});
	
		});
	
		describe("Creates a new model and adds _delete to the old one when variationData changes, and it keeps track of _generatedFrom", () => {

			/**
			 * checks that postUpdate() was called with the items[] array after the mongodb save
			 * so that each item has an id
			 */
			const expect_postUpdatecalledWithUpdatedIdItems = (calledWith: {[k: string]: any}) => {
				const mock: jest.Mock = utils.controller['postUpdate'] as any;

				expect(mock).toHaveBeenLastCalledWith(
					expect.anything(),
					calledWith, 
					expect.anything(),
				);

				// expect all items from front end and back end to have _id ObjectId
				const calls = mock.mock.calls;
				for (const i of Object.values<any>(calls[calls.length - 1][1])) {
					expect(i._id && MongoUtils.isObjectId(i._id)).toBe(true);
				}
				for (const i of calls[calls.length - 1][2]) {
					expect(i._id && MongoUtils.isObjectId(i._id)).toBe(true);
				}
			}
			
			it("single", async () => {
				const postMock = utils.controller['postUpdate'] = jest.fn();


				let res = await utils.save([{}]);
				await utils.patch(res[0]._id, [{op: "set", path: "variationData.field", value: "not_1"}]);
				
				let models = await utils.getModels();
				expect(models).toHaveLength(2);
		
				// ensure the patch is appplied
				expect(models.filter(m => m.variationData.field !== 'not_1' && m._deleted)).toHaveLength(1);
				expect(models.filter(m => m.variationData.field === 'not_1' && !m._deleted)).toHaveLength(1);
				expect_postUpdatecalledWithUpdatedIdItems({[models.find(m => m._deleted)._id.toString()]: models.find(m => !m._deleted)});

				// update the items after the patch
				// as the res[0] original now is deleted
				res = await utils.find();
				await utils.patch(res[0]._id, [{op: "set", path: "variationData.field", value: "not_not_1"}]);
				
				models = await utils.getModels();
				expect(models).toHaveLength(3);
		
				// ensure the patch is appplied
				expect(models.filter(m => m.variationData.field !== 'not_1' && m._deleted)).toHaveLength(1);
				expect(models.filter(m => m.variationData.field === 'not_1' && m._deleted)).toHaveLength(1);
				expect(models.filter(m => m.variationData.field === 'not_not_1' && !m._deleted)).toHaveLength(1);
				expect_postUpdatecalledWithUpdatedIdItems({[models.find(m => m.variationData.field === 'not_1')._id.toString()]: models.find(m => !m._deleted)});


				postMock.mockRestore();
			});
	
	
			it("multi patch/put", async () => {
				const postMock = utils.controller['postUpdate'] = jest.fn();
				
				let res = await utils.saveMulti([{models: [{}, {}]}]);
				expect(await utils.getModels()).toHaveLength(2);
	
				await utils.patchMulti(res[0]._id, [{op: "set", path: "models.0.variationData.field", value: "not_1"}]);
	
				let models = await utils.getModels();
				expect(models).toHaveLength(3);
				let del = models.filter(m => m._deleted);
				let active = models.filter(m => !m._deleted);
				
				expect(del).toHaveLength(1);
				expect(del[0].variationData.field).not.toBe("not_1");
				expect(active).toHaveLength(2);
				const changed = active.filter(a => a.variationData.field === 'not_1');
				expect(changed).toHaveLength(1);
				expect_postUpdatecalledWithUpdatedIdItems({[del[0]._id.toString()]: changed[0]});
		
	
				// update after deleted
				res = await utils.findMulti();
				// modify two items
				const putTarget = (await utils.findMulti({_id: res[0]._id}))[0];
				// we clone as we later have to ref _generatedFrom ids,
				// we could avoid clonin as we dont modify the target directly, 
				const cloned = ObjectUtils.cloneDeep(putTarget);
				cloned.models[0].variationData.asd = 3;
				cloned.models[1].variationData.quack = 3;
				await utils.putMulti(res[0]._id, cloned);
				
				models = await utils.getModels();
				expect(models).toHaveLength(5);
				del = models.filter(m => m._deleted);
				active = models.filter(m => !m._deleted);
	
				// esnure the acitve onces are the gud onces
				expect(del).toHaveLength(3);
				expect(del.filter(d => [putTarget.models[0]._id.toString(), putTarget.models[1]._id.toString()].includes(d._id.toString()))).toHaveLength(2);
				expect(del.filter(d => d.variationData.asd === 3 || d.variationData.quack === 3)).toHaveLength(0);
				expect(active).toHaveLength(2);
				expect(active.filter(d => d.variationData.asd === 3 || d.variationData.quack === 3)).toHaveLength(2);
				expect_postUpdatecalledWithUpdatedIdItems({
					[putTarget.models[0]._id.toString()]: active[0],
					[putTarget.models[1]._id.toString()]: active[1],
				});
		
				postMock.mockRestore();
			});
	
	
		});
	
		describe("updates base data on relative _delete objects", () => {
	
			let res: Model[];
			let models: Model[];
	
			// creates an item and updates it twice
			const createThreeModels = async (): Promise<Model[]> => {
				res = await utils.save([{}]);
	
				await utils.patch(res[0]._id, [{op: "set", path: "variationData.field", value: "var_field_0"}]);
				await utils.patch(res[0]._id, [{op: "set", path: "variationData.field", value: "var_field_1"}]);
	
				models = await utils.getModels();
				return res;
			};
	
	
			it("groupData", async () => {
				await createThreeModels();
				expect(models.filter(m => m.groupData.field !== 'groupd_data_field')).toHaveLength(3);
				
				await utils.patch(res[0]._id, [{op: "set", path: "groupData.field", value: "groupd_data_field"}]);
				models = await utils.getModels();
	
				expect(models).toHaveLength(3);
				expect(models.filter(m => m.groupData.field === 'groupd_data_field')).toHaveLength(3);
			});
	
			it("documentLocationsFilter", async () => {
				await createThreeModels();
				expect(models.filter(m => m.documentLocationsFilter.length === 1 && m.documentLocationsFilter[0] !== '2')).toHaveLength(3);
				
				await utils.patch(res[0]._id, [{op: "set", path: "documentLocationsFilter", value: ["2"]}]);
				models = await utils.getModels();
				
				expect(models).toHaveLength(3);
				expect(models.filter(m => m.documentLocationsFilter.length === 1 && m.documentLocationsFilter[0] === '2')).toHaveLength(3);	
			});
	
			it("documentLocation", async () => {
				await createThreeModels();
				expect(models.filter(m => m.documentLocation !== "asd")).toHaveLength(3);
	
				await utils.patch(res[0]._id, [{op: "set", path: "documentLocation", value: "asd"}]);
				models = await utils.getModels();
	
				expect(models).toHaveLength(3);
				expect(models.filter(m => m.documentLocation === 'asd')).toHaveLength(3);
			});
	
	
			it("only update the relative products", async () => {
				await createThreeModels();
				expect(models).toHaveLength(3);
				expect(models.filter(m => m.groupData.field !== 'groupd_data_field')).toHaveLength(3);
				
				// ensure that if there are other models that the update occurs on only one group
				await createThreeModels();
				expect(models).toHaveLength(6);
				expect(models.filter(m => m.groupData.field !== 'groupd_data_field')).toHaveLength(6);
	
				await utils.patch(res[0]._id, [{op: "set", path: "groupData.field", value: "groupd_data_field"}]);
				models = await utils.getModels();
	
				expect(models).toHaveLength(6);
				expect(models.filter(m => m.groupData.field !== 'groupd_data_field')).toHaveLength(3);
				expect(models.filter(m => m.groupData.field === 'groupd_data_field')).toHaveLength(3);
			});
	
		});
	
		describe("if a new variation corresponds to a _deleted one, then instead of creating a new model, it restores the old _deleted one", () => {
	
			it("single", async () => {
				let res = await utils.save([{}]);
				await utils.patch(res[0]._id, [{op: "set", path: "variationData.field", value: "not_1"}]);
				await utils.patch(res[0]._id, [{op: "set", path: "variationData.field", value: "not_not_1"}]);
				
				let models = await utils.getModels();
				expect(models).toHaveLength(3);
				expect(models.filter(m => m._deleted)).toHaveLength(2);
				expect(models.filter(m => m.variationData.field === 'not_1' && m._deleted)).toHaveLength(1);
		
				await utils.patch(res[0]._id, [{op: "set", path: "variationData.field", value: "not_1"}]);
				models = await utils.getModels();
				expect(models).toHaveLength(3);
				expect(models.filter(m => m._deleted)).toHaveLength(2);
				expect(models.filter(m => m.variationData.field === 'not_1' && !m._deleted)).toHaveLength(1);
			});
	
			it("multi", async () => {
				// we create two groups as to ensure we restore the correct one
				let res = await utils.saveMulti([{models: [
					{variationData: {f: 3}},
					{variationData: {f: 2}},
					{variationData: {f: 0}},
				]}, {models: [
					{variationData: {f: 4}},
					{variationData: {f: 1}},
				]}]);
				let models = await utils.getModels();
				expect(models).toHaveLength(5);
	
				let toPut = (await utils.findMulti({_id: res[0]._id}))[0];
				toPut.models.find(m => m.variationData.f === 3).variationData.f = 4;
				toPut.models.find(m => m.variationData.f === 0).variationData.f = 1;
				await utils.putMulti(res[0]._id, toPut);
	
				models = await utils.getModels();
				expect(models).toHaveLength(7);
				expect(models.filter(f => f._trackableGroupId === res[0]._id)).toHaveLength(5);
				expect(models.filter(f => f._trackableGroupId !== res[0]._id && f._deleted)).toHaveLength(0);
				expect(models.filter(d => d._deleted)).toHaveLength(2);
	
	
	
	
				toPut = (await utils.findMulti({_id: res[0]._id}))[0];
				toPut.models.find(m => m.variationData.f === 4).variationData.f = 3;
				toPut.models.find(m => m.variationData.f === 1).variationData.f = 0;
	
				await utils.putMulti(res[0]._id, toPut);
				models = await utils.getModels();
				expect(models).toHaveLength(7);
				expect(models.filter(f => f._trackableGroupId === res[0]._id)).toHaveLength(5);
				expect(models.filter(f => f._trackableGroupId !== res[0]._id && f._deleted)).toHaveLength(0);
				expect(models.filter(d => d._deleted)).toHaveLength(2);
				expect(models.filter(d => d._deleted && d.variationData.f === 4)).toHaveLength(1);
				expect(models.filter(d => d._deleted && d.variationData.f === 1)).toHaveLength(1);
			});
	
		});

	});

});

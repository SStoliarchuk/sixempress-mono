import { Collection } from "mongodb";
import { CrudUpdatesService } from "../../../services/crud-updates.service";
import { AbstractDbItemController } from "../abstract-db-item.controller";
import { CrudCollection } from "../crud-collection";

const ea = tt.arrayContaining;
const eo = expect.objectContaining;

const utils = (() => {
	
	CrudUpdatesService.registerAction((slug, type, model, ids) => {
		utils.allReturns.push({slug, modelClass: model, type, ids: ids.sort()})
	});
	CrudCollection['emit'] = (slug, type, model, ids) => {
		utils.allReturns.push({slug, modelClass: model, type, ids: ids.sort()})
	}

	class Asd extends AbstractDbItemController<any> {
		modelClass = "asd" as any;
		collName = "asd" as any;
		bePath = "asd" as any;
		requireDocumentLocation = false;
		requireDocumentLocationsFilter = false;
		dtd = {
			a: {type: ['any'], required: false},
			b: {type: ['any'], required: false},
		} as any;
	}
	
	const instance = new Asd();
	return {
		/**
		 * Contains all the triggered emit() paramters
		 */
		allReturns: [] as {slug: any, modelClass: string, type: 'create' | 'update' | 'delete', ids: string[]}[],
		/**
		 * Contains the value that are sent to service
		 * (the ones with the ids length filtered)
		 */
		serviceReturns: [] as {slug: any, modelClass: string, type: 'create' | 'update' | 'delete', ids: string[]}[],
		
		coll: undefined as Collection<any>,
		
		instance: instance,

		lengths: {
			create: 3,
			update: 6,
			delete: 4,
			total: 13,
		},

		getSimpleFunctions: (f = {}) => {
			return [
				['insertOne', [f, {}]],                     // create
				['findOneAndUpdate', [f, {$set: {a: 1}}]],  // update
				['findOneAndReplace', [f, {...f}]],         // update
				['findOneAndDelete', [f, {}]],              // delete
	
				['replaceOne', [f, {...f}]],                // update
				['updateOne', [f, {$set: {a: 1}}]],         // update
				['update', [f, {...f}]],                    // update
				['deleteOne', [f, {}]],                     // delete
				
				['insert', [f, {}]],                        // create
				['remove', [f, {}]],                        // delete
				['insertMany', [[f], {}]],                  // create
				['updateMany', [f, {$set: {a: 1}}]],        // update

				['deleteMany', [f, {}]],                    // delete
				
				// TOTAL:                           create = 3
				// TOTAL:                           update = 6
				// TOTAL:                           delete = 4
				// TOTAL:                                  = 13
			];
		},
		executeAllFn: async (f?) => {
			const fns = utils.getSimpleFunctions(f);
			for (let i = 0; i < fns.length; i++) {
				await utils.coll[fns[i][0] as any](...(fns as any)[i][1]);
				await tt.wait(10);
			}
		},

	}
})();

beforeAll(() => {
	CrudCollection.isEnabled = true;
	utils.coll = utils.instance.getCollToUse(tt.generateRequestObject());
});

// wait to let the notification go out
afterAll(async () => {
	await tt.wait(10);
});

beforeEach(() => {
	utils.allReturns = [];
	utils.serviceReturns = [];
});

describe('crud collection', () => {

	it('doesnt get ovverridden twice', async () => {

		class A1 extends AbstractDbItemController<any> {
			modelClass = "a1" as any;
			collName = "a1" as any;
			bePath = "a1" as any;
			requireDocumentLocation = false;
			requireDocumentLocationsFilter = false;
			dtd = {};
		}
		class A2 extends AbstractDbItemController<any> {
			modelClass = "a2" as any;
			collName = "a2" as any;
			bePath = "a2" as any;
			requireDocumentLocation = false;
			requireDocumentLocationsFilter = false;
			dtd = {};
		}
		class A3 extends AbstractDbItemController<any> {
			modelClass = "a3" as any;
			collName = "a3" as any;
			bePath = "a3" as any;
			requireDocumentLocation = false;
			requireDocumentLocationsFilter = false;
			dtd = {};
		}

		await new A1().getCollToUse(tt.generateRequestObject()).insertOne({});
		await new A2().getCollToUse(tt.generateRequestObject()).insertOne({});
		await new A3().getCollToUse(tt.generateRequestObject()).insertOne({});
		await tt.wait(100);

		expect(utils.allReturns).toEqual(ea([
			eo({modelClass: 'a1'}),
			eo({modelClass: 'a2'}),
			eo({modelClass: 'a3'}),
		]));

		await new A1().getCollToUse(tt.generateRequestObject()).insertOne({});
		await new A2().getCollToUse(tt.generateRequestObject()).insertOne({});
		await new A3().getCollToUse(tt.generateRequestObject()).insertOne({});
		await tt.wait(100);

		expect(utils.allReturns).toEqual(ea([
			eo({modelClass: 'a1'}),
			eo({modelClass: 'a2'}),
			eo({modelClass: 'a3'}),
			eo({modelClass: 'a1'}),
			eo({modelClass: 'a2'}),
			eo({modelClass: 'a3'}),
		]));

	});

	it('emits on all functions', async () => {

		const mock = jest.spyOn(CrudCollection, 'emit' as any);

		const fns = [
			...utils.getSimpleFunctions(),
			
			['bulkWrite', [[
				{insertOne: {document: {}}},
				// we dont need these items as they are not processed as there is no item in the db at this stage
				// but still, we do more tests down on these fields so its not a problem
				// {replaceOne: {filter: {}, replacement: {}}},
				// {updateOne: {filter: {}, update: {$set: {a: 1}}}},
				// {updateMany: {filter: {}, update: {$set: {a: 1}}}},
				// {deleteMany: {filter: {}}},
				// {deleteOne: {filter: {}}},
			], {}]],
		];
		for (let i = 0; i < fns.length; i++) {
			await utils.coll[fns[i][0] as any](...(fns as any)[i][1]);
			await tt.wait(50); // wait for emit
			expect(mock).toHaveBeenCalledTimes(i + 1);
		}

		mock.mockRestore();
	});
	
	describe('emits target ids', () => {

		describe('emits all modified id withouth querying', () => {

			let findTriggered = false;
			let old = [];
			// create manual mocks as we cannot spy a bound function
			beforeAll(() => {
				old = [utils.coll.find, utils.coll.findOne];
				utils.coll.find = utils.coll.findOne = (() => findTriggered = true) as any;
			});

			afterAll(() => {
				// expect no call to find funcitons
				expect(findTriggered).toBe(false);
				// restore
				utils.coll.find = old[0];
				utils.coll.findOne = old[1];
			});

			it('simple', async () => {
				const allFns = utils.getSimpleFunctions();
				await utils.executeAllFn({_id: '123'});
				await tt.wait(100);	

				// expect same calls as function and all containing the id '123'
				expect(utils.allReturns).toHaveLength(utils.lengths.total);
				expect(utils.allReturns.filter(i => i.type === 'create')).toHaveLength(utils.lengths.create);
				expect(utils.allReturns.filter(i => i.type === 'delete')).toHaveLength(utils.lengths.delete);
				expect(utils.allReturns.filter(i => i.type === 'update')).toHaveLength(utils.lengths.update);
				expect(utils.allReturns).toEqual(ea(allFns.map(f => (eo({ids: ['123']})))));
			});

			it('bulk', async () => {
				// add data to edit later
				await utils.coll.insertMany([
					{_id: 'rone'},
					{_id: 'uone'},
					{_id: 'omany'},
					{_id: 'dmany'},
					{_id: 'done'},
				]);
				await tt.wait(100); // wait for emit
				// clear to ensure we get correct data later
				utils.allReturns = [];
		
				// yee
				await utils.coll.bulkWrite([
					// create
					{insertOne: {document: {_id: 'ione'}}},
					// update
					{replaceOne: {filter: {_id: 'rone'}, replacement: {}}},
					{updateOne: {filter: {_id: 'uone'}, update: {$set: {a: 1}}}},
					{updateMany: {filter: {_id: 'umany'}, update: {$set: {a: 1}}}},
					// delete
					{deleteMany: {filter: {_id: 'dmany'}}},
					{deleteOne: {filter: {_id: 'done'}}},
				])
				await tt.wait(100);
				
				expect(utils.allReturns).toEqual(ea([
					eo({type: 'create', ids: ea(['ione'])}),
					eo({type: 'update', ids: ea(['rone', 'uone', 'umany'])}),
					eo({type: 'delete', ids: ea(['dmany', 'done'])}),
				]));
			});

		});

		describe('it queries items if not found', () => {

			it.todo('simple and bulk');

		});

	});

});
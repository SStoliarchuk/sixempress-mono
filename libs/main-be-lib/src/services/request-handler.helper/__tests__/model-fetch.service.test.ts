import { CS } from '../../context.service';
import { AbstractDbItemController } from '../../../object-format-controller/db-item/abstract-db-item.controller';
import { testSlug, generateRequestObject } from '../../../tests/setupTests';
import { ModelFetchService } from '../model-fetch.service';
import { FetchableField } from '../../../object-format-controller/fetchable-field';
import { ControllersService } from '../../controllers.service';

const testMC_1 = 'test_user_model_class'
const testMC_2 = 'test_diff_model_class'

const utils = (() => {

	class TestDifferentModel extends AbstractDbItemController<any> {
		modelClass = testMC_2 as any;
		bePath = "testDifferentBePath" as any;
		collName = "testDifferentCollName" as any;
		dtd = {
			name: { type: ['any'], required: false },
			phone: { type: ['any'], required: false },
		};
		getCollToUse(reqOrDbToUse): any {
			return CS.db.db(testSlug).collection(this.collName);
		}
	}

	class TestUser extends AbstractDbItemController<any> {
		modelClass = testMC_1 as any;
		bePath = "testUserBePath" as any;
		collName = "testUserCollName" as any;
		dtd = {
			name: { type: ['any'], required: false },
			phone: { type: ['any'], required: false },
		};
		getCollToUse(reqOrDbToUse): any {
			return CS.db.db(testSlug).collection(this.collName);
		}
	}

	ControllersService.registerController(TestDifferentModel);
	ControllersService.registerController(TestUser);

	return {
		userContr: tt.getBaseControllerUtils<any, any, any>({
			controller: new TestUser(),
			partialToFull: (ms) => ms.map(m => ({ ...m, documentLocation: '1', documentLocationsFilter: ['1']})),
		}),
		diffContr: tt.getBaseControllerUtils<any, any, any>({
			controller: new TestDifferentModel(),
			partialToFull: (ms) => ms.map(m => ({ ...m, documentLocation: '1', documentLocationsFilter: ['1'] })),
		}),
		req: () => generateRequestObject(),
	}

})();


beforeEach(async () => {
	await tt.dropDatabase();
})

describe("model-fetch.service", () => {

	it.todo('merges projections');

	it("fetches base objects", async () => {
		const ref = await utils.userContr.save([{ name: 'ref_name' }]);
		const test = await utils.userContr.save([{ name: '1', _ref: new FetchableField(ref[0]._id, testMC_1)}]);

		expect(test[0]._ref.fetched).toBe(undefined);
		await ModelFetchService.fetchAndSetFields(utils.req(), [{field: '_ref'}], test);
		expect(test[0]._ref.fetched).toEqual(tt.ee({name: 'ref_name'}));
	});

	it("fetches different modelclasses in same field multiple objects", async () => {
		const ref = await utils.userContr.save([{ name: 'ref_name' }]);
		const diff = await utils.diffContr.save([{ name: 'diff_name' }]);
		const test = await utils.userContr.save([
			{ name: '1', _ref: new FetchableField(ref[0]._id, testMC_1) },
			{ name: '2', _ref: new FetchableField(diff[0]._id, testMC_2) },
		]);

		await ModelFetchService.fetchAndSetFields(utils.req(), [{ field: '_ref' }], test);
		expect(test).toEqual(tt.ee([
			{ name: '1', _ref: { fetched: { name: 'ref_name' } } },
			{ name: '2', _ref: { fetched: { name: 'diff_name' } } },
		]));
	});

	it("applies the projection", async () => {
		const ref = await utils.userContr.save([{ name: 'ref_name', phone: 1 }]);
		const test = await utils.userContr.save([{ name: '1', _ref: new FetchableField(ref[0]._id, testMC_1) }]);

		expect(test[0]._ref.fetched).toBe(undefined);
		await ModelFetchService.fetchAndSetFields(utils.req(), [{ field: '_ref', projection: {name: 1} }], test);
		expect(test[0]._ref.fetched.name).toEqual('ref_name');
		expect(test[0]._ref.fetched.phone).toEqual(undefined);

		await ModelFetchService.fetchAndSetFields(utils.req(), [{ field: '_ref', projection: { phone: 1 } }], test);
		expect(test[0]._ref.fetched.name).toEqual(undefined);
		expect(test[0]._ref.fetched.phone).toEqual(1);
	});

	it('recursive fetch', async () => {
		const ref = await utils.userContr.save([{ name: 'ref_name', phone: 1 }]);
		const recur = await utils.userContr.save([{ name: 'recur_name', _ref: new FetchableField(ref[0]._id, testMC_1) }]);
		const test = await utils.userContr.save([{ name: '1', _ref: new FetchableField(recur[0]._id, testMC_1) }]);

		expect(test[0]._ref.fetched).toBe(undefined);
		await ModelFetchService.fetchAndSetFields(utils.req(), [{ field: '_ref' }], test);
		expect(test[0]._ref.fetched.name).toEqual('recur_name');
		expect(test[0]._ref.fetched._ref.fetched).toEqual(undefined);

		await ModelFetchService.fetchAndSetFields(utils.req(), [{ field: '_ref' }, {field: '_ref.fetched._ref'}], test);
		expect(test[0]._ref.fetched.name).toEqual('recur_name');
		expect(test[0]._ref.fetched._ref.fetched.name).toEqual('ref_name');
	});


	describe('array', () => {

		it("fetches array", async () => {
			const ref = await utils.userContr.save([{ name: 'ref_name' }]);
			const test = await utils.userContr.save([{
				name: '1', _ref: [
					new FetchableField(ref[0]._id, testMC_1),
					new FetchableField(ref[0]._id, testMC_1),
					new FetchableField(ref[0]._id, testMC_1),
				]
			}]);

			expect(test[0]._ref.map(r => r.fetched)).toEqual([undefined, undefined, undefined]);
			await ModelFetchService.fetchAndSetFields(utils.req(), [{ field: '_ref.*' }], test);
			expect(test[0]._ref).toEqual(tt.ee([
				{ fetched: { name: 'ref_name' } },
				{ fetched: { name: 'ref_name' } },
				{ fetched: { name: 'ref_name' } },
			]));
		});

		it('fetches array of different modelClasses', async () => {
			const ref = await utils.userContr.save([{ name: 'ref_name' }]);
			const diff = await utils.diffContr.save([{ name: 'diff_name' }]);
			const test = await utils.userContr.save([{
				name: '1', _ref: [
					new FetchableField(ref[0]._id, testMC_1),
					new FetchableField(diff[0]._id, testMC_2),
					new FetchableField(ref[0]._id, testMC_1),
				]
			}]);

			await ModelFetchService.fetchAndSetFields(utils.req(), [{ field: '_ref.*' }], test);
			expect(test[0]._ref).toEqual(tt.ee([
				{ fetched: { name: 'ref_name' } },
				{ fetched: { name: 'diff_name' } },
				{ fetched: { name: 'ref_name' } },
			]));
		});

		it('fetches array of objects', async () => {
			const ref = await utils.userContr.save([{ name: 'ref_name' }]);
			const recur = await utils.userContr.save([{ name: 'recur_name', _ref: [
				new FetchableField(ref[0]._id, testMC_1),
				new FetchableField(ref[0]._id, testMC_1),
			] }]);
			const test = await utils.userContr.save([{
				name: '1', _ref: [
					{ t: 1, b: new FetchableField(recur[0]._id, testMC_1) },
					{ t: 1, b: new FetchableField(recur[0]._id, testMC_1) },
					{ t: 1, b: new FetchableField(recur[0]._id, testMC_1) },
				]
			}]);

			expect(test[0]._ref.map(r => r.fetched)).toEqual([undefined, undefined, undefined]);
			await ModelFetchService.fetchAndSetFields(utils.req(), [{ field: '_ref.*.b' }, { field: '_ref.*.b.fetched._ref.*' }], test);
			expect(test[0]._ref).toEqual(tt.ee([
				{ b: { fetched: { name: 'recur_name', _ref: [
					{fetched: {name: 'ref_name'}}, 
					{fetched: {name: 'ref_name'}},
				] } } },
				{ b: { fetched: { name: 'recur_name', _ref: [
					{fetched: {name: 'ref_name'}}, 
					{fetched: {name: 'ref_name'}},
				] } } },
				{ b: { fetched: { name: 'recur_name', _ref: [
					{fetched: {name: 'ref_name'}}, 
					{fetched: {name: 'ref_name'}},
				] } } },
			]));
		});

		it('fetches array of objects recursive', async () => {
			const ref = await utils.userContr.save([{ name: 'ref_name' }]);
			const test = await utils.userContr.save([{
				name: '1', _ref: [
					{ t: 1, b: new FetchableField(ref[0]._id, testMC_1) },
					{ t: 1, b: new FetchableField(ref[0]._id, testMC_1) },
					{ t: 1, b: new FetchableField(ref[0]._id, testMC_1) },
				]
			}]);

			expect(test[0]._ref.map(r => r.fetched)).toEqual([undefined, undefined, undefined]);
			await ModelFetchService.fetchAndSetFields(utils.req(), [{ field: '_ref.*.b' }], test);
			expect(test[0]._ref).toEqual(tt.ee([
				{ b: { fetched: { name: 'ref_name' } } },
				{ b: { fetched: { name: 'ref_name' } } },
				{ b: { fetched: { name: 'ref_name' } } },
			]));
		});

	});

});

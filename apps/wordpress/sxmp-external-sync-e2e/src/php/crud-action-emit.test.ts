import bodyParser from 'body-parser';
import express from 'express';
import { productsRest } from './basic-rest-request';
import http from 'http';

const app = express();
let serverInstance: http.Server;

const utils = (() => {
	
	return {
		crudEmittedItems: [] as {origin_url: string, item_type: string, id: number}[],
		expectEmitted: (is: {t: string, i: number}[]) => {
			for (const i of is) {
				expect(utils.crudEmittedItems.find(p => p.item_type === i.t && p.id === i.i)).toBeTruthy();
			}
		},
		clearEmitted: () => {
			utils.crudEmittedItems = [];
		},
		...productsRest,
	}
})();

beforeAll((done) => {
	app.post('/5/slug/woo/crudupdate', bodyParser.json(), async (req, res) => {
		utils.crudEmittedItems.push(req.body);
		await tt.wait(100);
		res.sendStatus(200);
	});
	serverInstance = app.listen(50505, () => {
		done();
	});
});

afterAll((done) => {
	serverInstance.close(() => {
		done();
	});
});

beforeEach(() => {
	utils.clearEmitted();
});

describe('crud action emit', () => {

	// we need puppeteer/cypress
	it.todo('emits if manual actions wordpress editor');

	describe('correct type/id on create/update/delete of woo request', () => {
		const suppoertedTypes = ['product'];
		// const suppoertedTypes = ['order', 'product'];
		
		it('doesnt emit with no force header', async () => {
			for (const type of suppoertedTypes) {
				// create
				const b = (await utils.wooRequest('POST', type + 's', {}));
				expect(utils.crudEmittedItems).toEqual([]);
				
				// modify
				(await utils.wooRequest('PUT', type + 's/' + b.id, {}));
				expect(utils.crudEmittedItems).toEqual([]);
				
				// delete
				(await utils.wooRequest('DELETE', type + 's/' + b.id, {}));
				expect(utils.crudEmittedItems).toEqual([]);
			}
		});

		it('emits with header', async () => {
			for (const type of suppoertedTypes) {
				// create
				const b = (await utils.wooRequest('POST', type + 's', {}, {headers: {'x-crud-notify': true}}));
				await tt.wait(1000);
				utils.expectEmitted([{t: type, i: b.id}]);
				utils.clearEmitted();
				expect(utils.crudEmittedItems).toEqual([]);
				
				// modify
				(await utils.wooRequest('PUT', type + 's/' + b.id, {}, {headers: {'x-crud-notify': true}}));
				utils.expectEmitted([{t: type, i: b.id}]);
				utils.clearEmitted();
				expect(utils.crudEmittedItems).toEqual([]);
				
				// delete
				(await utils.wooRequest('DELETE', type + 's/' + b.id, {}, {headers: {'x-crud-notify': true}}));
				utils.expectEmitted([{t: type, i: b.id}]);
				utils.clearEmitted();
				expect(utils.crudEmittedItems).toEqual([]);
			}
		});

	});

	describe('my custom save', () => {
	
		it('emits', async () => {
			const alreadyPresentId = (await utils.mySave([{type: 'simple'}]))[0];
			expect(utils.crudEmittedItems).toEqual([]);
			utils.clearEmitted();
	
			const ids = await utils.mySave([
				{type: 'simple'},
				// MODIFY mode
				{id: alreadyPresentId, type: 'simple'},
				{type: 'simple'},
			], {headers: {'x-crud-notify': true}});
			utils.expectEmitted(ids.map(i => ({t: 'product', i})));
		});

		it('doesnt emit', async () => {
			const alreadyPresentId = (await utils.mySave([{type: 'simple'}]))[0];
			expect(utils.crudEmittedItems).toEqual([]);
	
			const ids = await utils.mySave([
				{type: 'simple'},
				// MODIFY mode
				{id: alreadyPresentId, type: 'simple'},
				{type: 'simple'},
			]);
			expect(utils.crudEmittedItems).toEqual([]);
		});

	});


	// we need to ensure the crud not are active as the hook is different
	// ie product cat
	describe('crud notification for taxonomy', () => {
	
		// hooks from WooProductCategories etc;
		it.todo('default taxonomy');

	});

	
});


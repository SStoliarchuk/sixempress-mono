import { PartialPricedRows, partToFull } from "@utils/priced-rows/__tests__/priced-rows.test.utils";
import { Filter } from "mongodb";
import { SaleAnalysisController } from "../SaleAnalysis.controller";

const utils = (() => {
	
	const instance = new SaleAnalysisController();

	return {
		instance: instance,
		add: async (ms: PartialPricedRows[], modelClass: string = '_m1') => {
			return instance.addAnalysis(tt.generateRequestObject(), modelClass as any, {} as any, await partToFull(ms));
		},
		find: async (f: Filter<any> = {}) => {
			return instance.findForUser(tt.generateRequestObject(), f, {skipFilterControl: true});
		}
	};
})();

describe('SaleAnalysisController', () => {

	it('creates idempotently the models', async () => {
		await utils.add([{totalPrice: 1, _id: '123'}], 'default_1');
		expect(await utils.find()).toEqual(tt.ee([
			{totalPrice: 1, _generatedFrom: {id: '123', modelClass: 'default_1'}}	
		]));

		// change model data but not id/class
		await utils.add([{totalPrice: 1412, _id: '123'}], 'default_1');
		expect(await utils.find()).toEqual(tt.ee([
			{totalPrice: 1412, _generatedFrom: {id: '123', modelClass: 'default_1'}}	
		]));

		// change id
		await utils.add([{totalPrice: 1412, _id: '1235'}], 'default_1');
		expect(await utils.find()).toEqual(tt.ee([
			{totalPrice: 1412, _generatedFrom: {id: '123', modelClass: 'default_1'}},
			{totalPrice: 1412, _generatedFrom: {id: '1235', modelClass: 'default_1'}},
		]));

		// change model with the new id
		await utils.add([{totalPrice: 144212, _id: '1235'}], 'default_1');
		expect(await utils.find()).toEqual(tt.ee([
			{totalPrice: 1412, _generatedFrom: {id: '123', modelClass: 'default_1'}},
			{totalPrice: 144212, _generatedFrom: {id: '1235', modelClass: 'default_1'}},
		]));

		// change class
		await utils.add([{totalPrice: 144212, _id: '1235'}], 'alternative_1');
		expect(await utils.find()).toEqual(tt.ee([
			{totalPrice: 1412, _generatedFrom: {id: '123', modelClass: 'default_1'}},
			{totalPrice: 144212, _generatedFrom: {id: '1235', modelClass: 'default_1'}},
			{totalPrice: 144212, _generatedFrom: {id: '1235', modelClass: 'alternative_1'}},
		]));

		// keep same and ensure no changes are present
		await utils.add([{totalPrice: 144212, _id: '1235'}], 'alternative_1');
		expect(await utils.find()).toEqual(tt.ee([
			{totalPrice: 1412, _generatedFrom: {id: '123', modelClass: 'default_1'}},
			{totalPrice: 144212, _generatedFrom: {id: '1235', modelClass: 'default_1'}},
			{totalPrice: 144212, _generatedFrom: {id: '1235', modelClass: 'alternative_1'}},
		]));

	});

});

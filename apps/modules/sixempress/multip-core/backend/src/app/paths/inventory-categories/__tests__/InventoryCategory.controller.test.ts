import { ModelClass } from "@utils/enums/model-class.enum";
import { FetchableField } from "@tests/setupTests";
import { InventoryCategory, InventoryCategoryControllerDeleteOptions } from "../InventoryCategory";
import { InventoryCategoryController } from "../InventoryCategory.controller";

const utils = (() => {

	return {
		...tt.getBaseControllerUtils<InventoryCategory, Partial<InventoryCategory>, InventoryCategoryController>({
			controller: new InventoryCategoryController(),
			partialToFull: (is) => is.map(i => ((i.name = i.name || ''), i as InventoryCategory)),
		})
	}

})();

beforeEach(tt.dropDatabase)

describe('inventory category controller', () => {

	it.todo('a lot');

	it('moves the child categories up when delete splicing the category', async () => {
		const ids = [];
		// create deep tree
		let is = await utils.save([{name: '1'}]);
		ids.unshift(is[0]._id.toString());
		is = await utils.save([{name: '2', extends: new FetchableField(is[0]._id, ModelClass.InventoryCategory)}]);
		ids.unshift(is[0]._id.toString());
		is = await utils.save([{name: '3', extends: new FetchableField(is[0]._id, ModelClass.InventoryCategory)}]);
		ids.unshift(is[0]._id.toString());
		is = await utils.save([{name: '4', extends: new FetchableField(is[0]._id, ModelClass.InventoryCategory)}]);
		
		// get the delete target
		const deleteTargetId = (await utils.find({name: '2'}))[0]._id.toString();
		const deletedTargetParentId = (await utils.find({name: '2'}))[0].extends.id.toString();

		// expect the three to be built correctly
		expect((await utils.find({name: '4'}))[0]._parentsTree).toEqual(ids);
		expect((await utils.find({name: '3'}))[0]._parentsTree).toEqual(ids.slice(1));
		
		// expect first child parent to be diff
		expect((await utils.find({name: '3'}))[0].extends.id).toEqual(deleteTargetId);
		
		// delete it
		await utils.delete({name: '2'}, {spliceDelete: true} as InventoryCategoryControllerDeleteOptions);
		
		// remove the second id
		ids.splice(ids.indexOf(deleteTargetId), 1);
		
		// expect for the tree to be correct
		expect((await utils.find({name: '4'}))[0]._parentsTree).toEqual(ids);
		expect((await utils.find({name: '3'}))[0]._parentsTree).toEqual(ids.slice(1));

		// expect for the first child to have a different parent
		expect((await utils.find({name: '3'}))[0].extends.id).toEqual(deletedTargetParentId);

		// expect the item to be deleted
		let items = await utils.find();
		expect(items).toHaveLength(3);
		expect(items).toEqual(tt.arrayContaining([
			tt.eo({name: '1'}),
			tt.eo({name: '3'}),
			tt.eo({name: '4'}),
		]));

		await utils.delete({name: '1'}, {spliceDelete: true} as InventoryCategoryControllerDeleteOptions);

		items = await utils.find();
		expect(items).toHaveLength(2);
		expect(items).toEqual(tt.arrayContaining([
			tt.eo({name: '3'}),
			tt.eo({name: '4'}),
		]));
		// undefined as there is no parent to set the extends
		// so it becames root category
		expect(items.find(n => n.name === '3').extends).toBe(undefined);

	});

});
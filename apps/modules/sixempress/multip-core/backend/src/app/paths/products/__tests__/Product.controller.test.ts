describe("ProductController", () => {

	// as when we delete the groupModel we set only _groupDeleted because we need to know which models were active when we restore the groupModel
	// thus in the productControlelr when we fetch, we check only the _deleted, and it's bad
	// beacause we ignore the _groupDeleted
	it.todo('sets _groupDeleted on get multi');

});
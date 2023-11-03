import { SaleDesk } from "../sale-desk";

// SaleDesk;

describe('sale desk', () => {

	// when we complete a sale/return etc we need to reset the productsList.
	// this way when we do the next sale the _amountData is refreshed correctly.
	// otherwise we would need a cache in memory with all the stocks and that is unnecessary
	it.todo('clears the productsList from state as to not contain incrorrect stock amount');

	it.todo('re-adjust the stock when clearing the sale tab');

	it.todo('enables no amount left products for return tab');

	// prior we were passing pg.models[0] instead of the collapsed
	it.todo('properly passes the `collapsedModels` on click pop');

	// we didnt have {_deleted: null} setup
	it.todo('allows to chose the additional stock products manually');

});
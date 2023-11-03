import to from "await-to-js";
import { FetchableField, RequestHelperService } from "@sixempress/main-be-lib";
import { ObjectId } from "mongodb";
import { ModelClass } from "../../../utils/enums/model-class.enum";
import { SoftwareInstanceController } from "../SoftwareInstance.controller";
import { SoftwareInstance } from "../SoftwareInstance.dtd";

type PartialSoft = Partial<SoftwareInstance>;

const utils = (() => {
	
	// use the testslug db;
	class TestBusControl extends SoftwareInstanceController {
		Attributes = { view: 1, add: 1, modify: 1, delete: 1, }
		public getDbToUse() { return RequestHelperService.getClientDbBySlug(tt.testSlug); }
	}
	
	const controller = new TestBusControl();

	const _internal = {
		partialToFull: async (bs: PartialSoft[]): Promise<SoftwareInstance[]> => {

			for (const b of bs) {
				b.server = b.server || new FetchableField(new ObjectId().toString(), ModelClass.ServerNode);
				b.slug = b.slug || Math.random().toString();
				b.name = b.name || Math.random().toString();
				b.loginSlug = b.loginSlug || Math.random().toString();
				b.expires = b.expires || false;
				b.locations = b.locations || [{isActive: true, name: 'a'}];
				b.admins = b.admins || [new FetchableField(new ObjectId().toString(), ModelClass.Contact)];
				b.documentLocationsFilter = b.documentLocationsFilter || ['*'];
				// b.services = b.services || {};
			}
			return bs as SoftwareInstance[];
		}
	}

	return tt.getBaseControllerUtils<SoftwareInstance, PartialSoft, TestBusControl>({
		controller: controller,
		partialToFull: _internal.partialToFull
	});

})();

beforeEach(async () => {
	await tt.dropDatabase();
});

describe('SoftwareInstance.controller.test', () => {

	describe('saving', () => {

		describe('update', () => {

			it('cannot change slug', async () => {
				const saved = (await utils.save([{slug: '1'}]))[0];
				
				// random change not changin slug
				let [e, d] = await to(utils.patch(saved, [{op: 'set', path: 'server', value: new FetchableField(new ObjectId().toString(), ModelClass.ServerNode)}]));
				expect(e).toBeNull();
				
				// changin the slug so error
				[e, d] = await to(utils.patch(saved, [{op: 'set', path: 'slug', value: 'asd'}]));
				expect(e).not.toBeNull();

				saved.slug = 'aaa';
				[e, d] = await to(utils.put(saved));
				expect(e).not.toBeNull();
			});
			
			it.todo('ensure the same old business ids are present and in the same order');

		});

		// we need to check that the ids used are the {businessIdx}.{locId}
		// and that those locations are actually valid (aka present in the fully built software info)
		it.todo('ensures that the location ids for the services are valid')


		describe('unique fields on save/modify check: "loginSlug"', () => {

			const uniqueFields: (keyof SoftwareInstance)[] = ['slug', 'loginSlug'];
	
			it('modify', async () => {
				const f = 'loginSlug';
				let e, d;

				const saved = (await utils.save([{[f]: '1'}]))[0];
				const conflicting = (await utils.save([{[f]: '2'}]))[0];

				[e, d] = await to(utils.patch(saved, [{op: 'set', path: 'server', value: new FetchableField(new ObjectId().toString(), ModelClass.ServerNode)}]));
				expect(e).toBe(null);

				[e, d] = await to(utils.patch(saved, [{op: 'set', path: f, value: '3'}]));
				expect(e).toBe(null);

				[e, d] = await to(utils.patch(saved, [{op: 'set', path: f, value: '2'}]));
				expect(e).not.toBe(null);

				// expect no error after conflicting item is removed
				await utils.controller.getRawCollection().deleteOne({[f]: '2'});
				[e, d] = await to(utils.patch(saved, [{op: 'set', path: f, value: '2'}]));
				expect(e).toBe(null);
			});
	
		});

	});

	describe('getCompleteSoftwareInfo()', () => {

		it.todo('fetches the server');

		it.todo('remaps locations ids to "{businessIdx}.{locId}"');

		describe('byUser filtering', () => {

			it.todo('removes the locations not visible by the user');
	
			it.todo('removes the business if no location are available, but withouth changing id');

			it.todo('filters the services object based on the user attributes');

		});

	});

});

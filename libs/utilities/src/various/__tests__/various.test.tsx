import { ReactUtils } from '../react-utils/react-utils';
import { AuthService } from '../../../services/authentication/authentication';
import { ObjectUtils } from '../object-utils';
import { Helpers } from '../helpers';

// TODO rewrite this whole test

jest.mock('../../../services/ui/ui-settings.service', () => ({
	UiSettings: {
		getLocationsFilteredByUser: () => [{_id: "asd", name: "asd", isActive: true}],
		getLocationsFilteredByUser: () => [{_id: "asd", name: "asd", isActive: true}],
	}
}));

describe("Helpers (helpers.ts)", () => {
	

	describe("checkAttributes()", () => {
		
		const testFn = Helpers.checkAttributes.bind(Helpers);

		it("removes falsy values (for 'condition && settings' syntax)", () => {
			let obj: any = [];
			testFn(obj)
			expect(obj).toHaveLength(0);

			obj = [false] as any;
			testFn(obj)
			expect(obj).toHaveLength(0);

			obj = [false, undefined, null, 0, ""] as any;
			testFn(obj)
			expect(obj).toHaveLength(0);

			obj = [{type: 'cut'}, false, undefined, null, 0, ""] as any;
			testFn(obj)
			expect(obj).toHaveLength(1);
		});


		it("check with no fields", () => {
			const obj = [{a: 1, b: 2}, {a: 1}, {b: 3}, {f: 1}];
			testFn(ObjectUtils.cloneDeep(obj));
			expect(obj).toEqual(obj);
		});

			
		it('check for the required fields', () => {
			
			const getArrP = (att: number[][]) => att.map((a, i) => ({a: i, attributes: {required: a}}));
		
			const checkP = (userAtt: number[], att: number[][], expectedIdx: number[]) => {
				AuthService.auth.client.tokenAuthz = {user: {att: userAtt}} as any;
				const res = getArrP(att);
				testFn(res);
				expect(res).toEqual(expectedIdx.map(i => ({a: i, attributes: {required: att[i]}})));
			};

			checkP(
				[10, 30],
				[[], []],
				[],
			);

			checkP(
				[10, 30],
				[[10, 30], [10]],
				[0, 1],
			);

			checkP(
				[30],
				[[10, 30], [10]],
				[0],
			);

			checkP(
				[],
				[[10, 30], [10]],
				[],
			);

			checkP(
				[10, 30, 3],
				[[10, 30], [10]],
				[0, 1],
			);

			checkP(
				[10, 30, 3],
				[[10, 30], [4], [10]],
				[0, 2],
			);

		});

	});

});

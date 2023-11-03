import { CacheKeys } from "../../../utils/enums/cache-keys.enum";
import { LibAttribute } from "../../../utils/enums/default-enums.enum";
import { ObjectUtils } from "@sixempress/utilities";
import { AuthService } from "../../authentication/authentication";
import { BusinessLocation } from "../../context-service/context.dtd";
import { DataStorageService } from "@sixempress/utilities";
import { BusinessLocationsService } from "../business-locations.service";

type PartialBusinessLocation = Omit<Partial<BusinessLocation>, '_id'> & {_id?: string | number};

const utils = (() => {
	return {
		service: BusinessLocationsService,
		setLocations: (locs: PartialBusinessLocation[]) => {
			locs.forEach((l, i) => {
				l.isActive ??= true;
				l.name ??= i.toString();
				l._id ??= i as any;

				l._id = l._id.toString();
			});
			utils.service.updateByBusiness({locations: locs} as any);
		},
		cache: (action: 'set' | 'del' | 'get', item: 'locationFilter' | 'chosenLocationId', val?: any) => {
			let k;
			switch (item) {
				case 'locationFilter': k = CacheKeys.addLocationFilter; break;
				case 'chosenLocationId': k = CacheKeys.chosenLocation; break;
			}
			
			switch (action) {
				case 'set': return DataStorageService.localStorage.setItem(k, val);
				case 'get': return DataStorageService.localStorage.getItem(k);
				case 'del': return DataStorageService.localStorage.removeItem(k);
			}
		}
	}
})();

describe('business locations service', () => {

	describe('updating by business config', () => {
		const fn = utils.setLocations;

		// we dont do this as it's confusing having it saved in memory
		it.skip('restores the addChosenLocationFilter flag from cache only if more than 1 locations', () => {
			const restoreFn = (locAmounts: number, cacheValue?: boolean) => {
				utils.cache(typeof cacheValue !== 'undefined' ? 'set' : 'del', 'locationFilter', cacheValue);

				fn(new Array(locAmounts).fill(undefined).map((l, i) => (
					{isActive: true, name: 'a', _id: i}
				)));
			}


			restoreFn(1);
			expect(utils.service.addChosenLocationFilter).toBe(false);
			
			restoreFn(2);
			expect(utils.service.addChosenLocationFilter).toBe(false);

			restoreFn(1, true);
			expect(utils.service.addChosenLocationFilter).toBe(false);


			
			restoreFn(1, true);
			expect(utils.service.addChosenLocationFilter).toBe(false);

			restoreFn(2, true);
			expect(utils.service.addChosenLocationFilter).toBe(true);

			restoreFn(2);
			expect(utils.service.addChosenLocationFilter).toBe(false);

			restoreFn(2, false);
			expect(utils.service.addChosenLocationFilter).toBe(false);
		});

		it('updates the rawLocations', () => {
			let items = [
				{isActive: true, name: '1', _id: 1},
				{isActive: true, name: '2', _id: '2'},

				{isActive: false, name: '3', _id: '3'},
				{isActive: false, name: '4', _id: 4},
			];
			fn(items);
			expect(utils.service['rawLocations']).toEqual(items);
			expect(utils.service['rawLocationsHM']).toEqual(ObjectUtils.arrayToHashmap(items, '_id'));


			items = [items[0]];
			fn(items);
			expect(utils.service['rawLocations']).toEqual(items);
			expect(utils.service['rawLocationsHM']).toEqual(ObjectUtils.arrayToHashmap(items, '_id'));

		});

		describe('chosenLocationId', () => {

			it('if no location to restore is present, and the new locations do not contain the old RAM selection, it restore the chosen to undefined', () => {
				fn([{_id: 'a'}]);
				expect(utils.service.chosenLocationId).toBe('a');
				
				utils.cache('del', 'chosenLocationId');
				fn([{_id: 'c'}, {_id: 'b'}]);
				expect(utils.service.chosenLocationId).toBe(undefined);
			});

			it('if only 1 location is available, then it sets that one as selected', () => {
				fn([{_id: 'quakc'}]);
				expect(utils.service.chosenLocationId).toBe('quakc');

				fn([{_id: 'yee'}]);
				expect(utils.service.chosenLocationId).toBe('yee');

				fn([{_id: 'a'}, {_id: 'b'}]);
				expect(utils.service.chosenLocationId).toBe(undefined);
			});

		});

	});

	describe('add location filter', () => {

		it.skip('stores the value in cache', () => {
			utils.service.addChosenLocationFilter = false;
			expect(utils.cache('get', 'locationFilter')).toBe(String(false));
			expect(utils.service.addChosenLocationFilter).toBe(false);

			utils.service.addChosenLocationFilter = true;
			expect(utils.cache('get', 'locationFilter')).toBe(String(true));
			expect(utils.service.addChosenLocationFilter).toBe(true);

			utils.service.addChosenLocationFilter = false;
			expect(utils.cache('get', 'locationFilter')).toBe(String(false));
			expect(utils.service.addChosenLocationFilter).toBe(false);
		});

	});

	describe('currently chosen location', () => {

		beforeEach(() => {
			utils.setLocations([
				{_id: 1},
				{_id: 2},
			]);
		});

		it('stores in cache', () => {
			utils.service.chosenLocationId = undefined;
			expect(utils.service.chosenLocationId).toBe(undefined);
			expect(utils.cache('get', 'chosenLocationId')).toBe(null); // localStorage saves it as null

			utils.service.chosenLocationId = "1";
			expect(utils.service.chosenLocationId).toBe("1");
			expect(utils.cache('get', 'chosenLocationId')).toBe("1");

			utils.service.chosenLocationId = undefined;
			expect(utils.service.chosenLocationId).toBe(undefined);
			expect(utils.cache('get', 'chosenLocationId')).toBe(null); // localStorage saves it as null

			utils.service.chosenLocationId = "2";
			expect(utils.service.chosenLocationId).toBe("2");
			expect(utils.cache('get', 'chosenLocationId')).toBe("2");
		});

		it('sets undefined if the given id is not present', () => {
			utils.service.chosenLocationId = "2";
			expect(utils.service.chosenLocationId).toBe("2");
			expect(utils.cache('get', 'chosenLocationId')).toBe("2");

			utils.service.chosenLocationId = "3";
			expect(utils.service.chosenLocationId).toBe(undefined);
			expect(utils.cache('get', 'chosenLocationId')).toBe(null);
		});

		it('emits changes when changin locationId', async () => {
			let lastEmitted = null;
			utils.service.chosenLocationChanges.subscribe(r => lastEmitted = r);
			
			let setVal = async (v) => {
				utils.service.chosenLocationId = v;
				await new Promise<void>(r => setTimeout(() => r(), 0));
			};

			await setVal('1');
			expect(lastEmitted).toBe('1');

			await setVal('5');
			expect(lastEmitted).toBe(undefined);

			await setVal('2');
			expect(lastEmitted).toBe('2');

			await setVal(undefined);
			expect(lastEmitted).toBe(undefined);
		});

	});

	describe.skip('returning locations', () => {
		
		beforeEach(() => {
			utils.setLocations([
				{}, 
				{}, 
				{isActive: false}, 
				{},
				{isForStorageOnly: true},
				{isForStorageOnly: true, isActive: false},
				{},
			]);
		});

		it('returns locations for UI', () => {
			expect(utils.service.getLocationsFilteredByUser(false)).toEqual([
				expect.objectContaining({_id: "0"}),
				expect.objectContaining({_id: "1"}),
				// expect.objectContaining({_id: "2"}),
				expect.objectContaining({_id: "3"}),
				// expect.objectContaining({_id: "4"}),
				// expect.objectContaining({_id: "5"}),
				expect.objectContaining({_id: "6"}),
			]);

			expect(utils.service.getLocationsFilteredByUser(true)).toEqual([
				expect.objectContaining({_id: "0"}),
				expect.objectContaining({_id: "1"}),
				expect.objectContaining({_id: "2"}),
				expect.objectContaining({_id: "3"}),
				// expect.objectContaining({_id: "4"}),
				// expect.objectContaining({_id: "5"}),
				expect.objectContaining({_id: "6"}),
			]);
		});

		it('returns all locations', () => {
			expect(utils.service.getLocationsFilteredByUser(false)).toEqual([
				expect.objectContaining({_id: "0"}),
				expect.objectContaining({_id: "1"}),
				// expect.objectContaining({_id: "2"}),
				expect.objectContaining({_id: "3"}),
				expect.objectContaining({_id: "4"}),
				// expect.objectContaining({_id: "5"}),
				expect.objectContaining({_id: "6"}),
			]);

			expect(utils.service.getLocationsFilteredByUser(true)).toEqual([
				expect.objectContaining({_id: "0"}),
				expect.objectContaining({_id: "1"}),
				expect.objectContaining({_id: "2"}),
				expect.objectContaining({_id: "3"}),
				expect.objectContaining({_id: "4"}),
				expect.objectContaining({_id: "5"}),
				expect.objectContaining({_id: "6"}),
			]);
		});

	});

	describe('returns the values for select fields', () => {

		beforeEach(() => {
			utils.setLocations([
				{_id: 0, },
				{_id: 1, },
				{_id: 2, isActive: false}, 
				{_id: 3, },
				{_id: 4, isForStorageOnly: true},
				{_id: 5, isForStorageOnly: true, isActive: false},
				{_id: 6, },
			]);
		});


		describe('doc visibility', () => {

			let mock: jest.SpyInstance;
	
			beforeEach(() => {
				mock = jest.spyOn(AuthService, 'isAttributePresent');
				mock.mockReturnValue(false);
			});

			afterEach(() => { 
				mock.mockRestore(); 
			});
	
			const fn = utils.service.getDocVisSelectValues

			it('returns all the items normally withouth global vis', () => {
				expect(fn()).toEqual([
					{label: '0', value: '0'},
					{label: '1', value: '1'},
					// {label: '2', value: '2'},
					{label: '3', value: '3'},
					// {label: '4', value: '4'},
					// {label: '5', value: '5'},
					{label: '6', value: '6'},
				])
			});

			it('returns the global visibility if the attribute is present', () => {
				mock.mockImplementation((att) => att === LibAttribute.canSetGlobalLocFilter);

				expect(fn()).toEqual([
					{label: 'GLOBALE', value: '*'},
					{label: '0', value: '0'},
					{label: '1', value: '1'},
					// {label: '2', value: '2'},
					{label: '3', value: '3'},
					// {label: '4', value: '4'},
					// {label: '5', value: '5'},
					{label: '6', value: '6'},
				])
			});

			it('adds disabled/storage option if _id is present in input', () => {
				expect(fn()).toEqual([
					{label: '0', value: '0'},
					{label: '1', value: '1'},
					// {label: '2', value: '2'},
					{label: '3', value: '3'},
					// {label: '4', value: '4'},
					// {label: '5', value: '5'},
					{label: '6', value: '6'},
				]);

				expect(fn(['2', '10', '4'])).toEqual([
					{label: '0', value: '0'},
					{label: '1', value: '1'},
					{label: '3', value: '3'},
					// {label: '5', value: '5'},
					{label: '6', value: '6'},
					
					{label: '2', value: '2'},
					{label: 'Altra Posizione #2', value: '10'},
					{label: '4', value: '4'},
				]);
			});

			it('adds global option if present in input value even though the user doesnt have attribute for global', () => {
				expect(fn()).toEqual([
					{label: '0', value: '0'},
					{label: '1', value: '1'},
					{label: '3', value: '3'},
					{label: '6', value: '6'},
				]);

				expect(fn(['*'])).toEqual([
					{label: 'GLOBALE', value: '*'},
					{label: '0', value: '0'},
					{label: '1', value: '1'},
					{label: '3', value: '3'},
					{label: '6', value: '6'},
				]);
			});

			it('returns numbered anonyoums positition in case the current user cannot see those positions', () => {
				expect(fn(['10'])).toEqual([
					{label: '0', value: '0'},
					{label: '1', value: '1'},
					{label: '3', value: '3'},
					{label: '6', value: '6'},
					{label: 'Altra Posizione #1', value: '10'},
				]);

				expect(fn(['10', '12', '0', '20'])).toEqual([
					{label: '0', value: '0'},
					{label: '1', value: '1'},
					{label: '3', value: '3'},
					{label: '6', value: '6'},
					{label: 'Altra Posizione #1', value: '10'},
					{label: 'Altra Posizione #2', value: '12'},
					{label: 'Altra Posizione #4', value: '20'},
				]);
			});

		});

		describe('doc position', () => {

			const fn = utils.service.getDocPosSelectValues

			it('returns all the items normally', () => {
				expect(fn()).toEqual([
					{label: '0', value: '0'},
					{label: '1', value: '1'},
					// {label: '2', value: '2'},
					{label: '3', value: '3'},
					{label: '4', value: '4'},
					// {label: '5', value: '5'},
					{label: '6', value: '6'},
				])
			});

			it('adds disabled if value is present', () => {
				expect(fn('2')).toEqual([
					{label: '0', value: '0'},
					{label: '1', value: '1'},
					{label: '3', value: '3'},
					{label: '4', value: '4'},
					{label: '6', value: '6'},
					
					{label: '2', value: '2'},
				]);
			});

			it('adds anonymous item', () => {
				expect(fn('0')).toEqual([
					{label: '0', value: '0'},
					{label: '1', value: '1'},
					{label: '3', value: '3'},
					{label: '4', value: '4'},
					{label: '6', value: '6'},
				]);

				expect(fn('10')).toEqual([
					{label: '0', value: '0'},
					{label: '1', value: '1'},
					{label: '3', value: '3'},
					{label: '4', value: '4'},
					{label: '6', value: '6'},
					{label: 'Altra Posizione', value: '10'},
				]);
			});

		});

	});

});

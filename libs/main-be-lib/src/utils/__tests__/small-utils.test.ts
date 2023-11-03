import { SmallUtils } from "../small-utils";

describe('small-utils', () => {

	describe('debouce', () => {

		it('debounces the fn by the given amount of time', async () => {
			let count = 0;
			const fn = SmallUtils.debounce(100, () => count++);
			
			fn();
			await tt.wait(80);
			expect(count).toBe(0);
			
			// debounce
			fn();
			await tt.wait(80);
			expect(count).toBe(0);

			// debounce
			fn();
			await tt.wait(80);
			expect(count).toBe(0);

			// let the fn complete
			await tt.wait(30);
			expect(count).toBe(1);

			// ensure it is not increased more
			await tt.wait(100);
			expect(count).toBe(1);
		});

		it('has a max time debounce after which it forces the execution', async () => {
			let count = 0;
			const fn = SmallUtils.debounce(100, () => count++, 200);
			
			fn();
			await tt.wait(80);
			expect(count).toBe(0);
			
			// debounce
			fn();
			await tt.wait(80);
			expect(count).toBe(0);

			// try to debounce again
			fn();
			// but here the maxTime will already have passed
			// so the current val will be 1
			await tt.wait(80);
			expect(count).toBe(1);
			
			fn();
			await tt.wait(80);
			expect(count).toBe(1);

			// as the first fn is completed
			// we wait for the second fn
			await tt.wait(30);
			expect(count).toBe(2);

			// ensure it is not increased more
			await tt.wait(100);
			expect(count).toBe(2);
		});

	});

});

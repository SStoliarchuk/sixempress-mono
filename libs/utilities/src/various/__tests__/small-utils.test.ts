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

	describe('switchPromise', () => {

		it('takes last call always', async () => {
			const switched = SmallUtils.switchPromise((time) => new Promise(r => setTimeout(r, time)));

			let results = [];
			switched(100).then(r => results.push(100));
			switched(50).then(r => results.push(50));
			switched(5).then(r => results.push(5));
			
			// wait for all the time summed to be passed
			await tt.wait(200);

			// only the last present
			expect(results).toEqual([5]);


			// invert requests
			results = [];
			switched(5).then(r => results.push(5));
			switched(50).then(r => results.push(50));
			switched(100).then(r => results.push(100));
			
			// wait for all the time summed to be passed
			await tt.wait(200);

			// only the last present
			expect(results).toEqual([100]);
		});

		it('blocks current request', async () => {
			const switched = SmallUtils.switchPromise((time) => new Promise(r => setTimeout(r, time)));
			
			let results = [];
			switched(5).then(r => results.push(5));
			switched(50).then(r => results.push(50));
			switched(100).then(r => results.push(100));
			
			// stop all
			switched.dropCurrent();
			
			// wait for all the time summed to be passed and nothing to be ppesent
			await tt.wait(200);
			expect(results).toEqual([]);
		});
		

	});

});

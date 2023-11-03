import { LoadingOverlay } from '../loading-overlay';
import { cleanup, fireEvent, render, RenderResult, screen, within } from '@testing-library/react';

beforeAll(() => {
	render(<LoadingOverlay/>);
});

it.todo('test loading overlay');

describe.skip("LoadingOverlay loading-overlay.tsx", () => {

	it("display the loader normally", () => {
		LoadingOverlay.loading = true;
		expect(document.body.querySelector(".lds-dual-ring")).toBeTruthy();
		expect(document.body.querySelector("#loader-container")).toBeTruthy();
		expect(document.body.querySelector(".loading-text").innerHTML).toBe('');

		LoadingOverlay.loading = false;
		expect(document.body.querySelector(".lds-dual-ring")).toBeFalsy();
		expect(document.body.querySelector("#loader-container")).toBeFalsy();
		expect(document.body.querySelector(".loading-text")).toBeFalsy();

		LoadingOverlay.loading = true;
		expect(document.body.querySelector(".lds-dual-ring")).toBeTruthy();
		expect(document.body.querySelector("#loader-container")).toBeTruthy();
		expect(document.body.querySelector(".loading-text").innerHTML).toBe('hello');
	});

	it("buffers the loading requests", () => {
		LoadingOverlay.clearLoading();
		expect(document.body.querySelector(".lds-dual-ring")).toBeFalsy();
		expect(document.body.querySelector("#loader-container")).toBeFalsy();
		expect(document.body.querySelector(".loading-text")).toBeFalsy();

		LoadingOverlay.loading = true;
		LoadingOverlay.loading = true;
		LoadingOverlay.loading = true;
		LoadingOverlay.loading = true;
		LoadingOverlay.loading = true;
		expect(document.body.querySelector("#loader-container")).not.toBeFalsy();

		LoadingOverlay.loading = false;
		expect(document.body.querySelector("#loader-container")).not.toBeFalsy();
		LoadingOverlay.loading = false;
		expect(document.body.querySelector("#loader-container")).not.toBeFalsy();
		LoadingOverlay.loading = false;
		expect(document.body.querySelector("#loader-container")).not.toBeFalsy();
		LoadingOverlay.loading = false;
		LoadingOverlay.loading = false;
		expect(document.body.querySelector("#loader-container")).toBeFalsy();


		LoadingOverlay.loading = true;
		LoadingOverlay.loading = true;
		LoadingOverlay.loading = true;
		LoadingOverlay.loading = true;
		LoadingOverlay.loading = true;
		expect(document.body.querySelector("#loader-container")).not.toBeFalsy();
		LoadingOverlay.clearLoading();
		expect(document.body.querySelector("#loader-container")).toBeFalsy();
	});

	it("sets the loader in async", async () => {
		LoadingOverlay.clearLoading();
		await LoadingOverlay.loadingAsync(true);
		await LoadingOverlay.loadingAsync(true);

		expect(document.body.querySelector("#loader-container")).not.toBeFalsy();

		await LoadingOverlay.loadingAsync(false);
		expect(document.body.querySelector("#loader-container")).not.toBeFalsy();
		await LoadingOverlay.loadingAsync(false);
		expect(document.body.querySelector("#loader-container")).toBeFalsy();

	});

});

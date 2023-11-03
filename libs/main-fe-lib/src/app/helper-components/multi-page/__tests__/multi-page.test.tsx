import { MultiPage, MultiPageTabs } from "../multi-page";
import { MultiPagesConfiguration } from "../dtd";
import { AuthService } from "../../../services/authentication/authentication";
import { DataStorageService } from "@sixempress/utilities";
import { CacheKeys } from "../../../utils/enums/cache-keys.enum";
import { Helpers } from "../../../utils/various/helpers";
import { RouterService } from "../../../services/router/router-service";
import { RouteComponentProps } from '@sixempress/theme';


const getPages = (): MultiPagesConfiguration[] => [
	{
		name: "path1",
		routePath: 'path1',
		attributes: {required: [2, 3]},
	}, 
	{
		name: "path2",
		routePath: 'path2',
		attributes: {required: [1]},
	},
	{
		name: "path3",
		routePath: 'path3',
	},
];

class Test extends MultiPageTabs {

}

RouterService['navigate'] = jest.fn();

const props: RouteComponentProps & {pages: MultiPagesConfiguration[]} = {router: {path: '/multipage'}, pages: getPages()};

describe("MultiPage multi-page.tsx", () => {

	it("calls check attributes on the paths given", () => {
		const fn = jest.spyOn(Helpers, 'checkAttributes');
		fn.mockClear();

		const comp = new Test(props);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenLastCalledWith(comp['pages']);

		fn.mockRestore();
	});

	it("navigates to child on generation instead of staying 'blank'", () => {
		let comp: Test;
		
		const fn = jest.spyOn(RouterService, 'goto');

		// expect to move to first avaible child
		AuthService.auth.client.tokenAuthz.user.att = [1, 2, 3, 4];
		comp = new Test(props);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith("/multipage/path1", true);

		// expect to move to stored child
		DataStorageService.localStorage.setItem(CacheKeys.multiPagePrefix + '/multipage', 'path3');
		comp = new Test(props);
		expect(fn).toHaveBeenCalledTimes(2);
		expect(fn).toHaveBeenCalledWith("/multipage/path3", true);

		// ignore cache if the end path is not available
		AuthService.auth.client.tokenAuthz.user.att = [1, 2, 3, 4, 5];
		comp = new Test(props);
		DataStorageService.localStorage.setItem(CacheKeys.multiPagePrefix + '/multipage', 'path3');
		expect(fn).toHaveBeenCalledWith("/multipage/path1", true);

		// navigate on first available path
		DataStorageService.localStorage.clear();
		AuthService.auth.client.tokenAuthz.user.att = [1];
		comp = new Test(props);
		expect(fn).toHaveBeenCalledWith("/multipage/path2", true);

		fn.mockRestore();

	});


});

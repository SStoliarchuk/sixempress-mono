import { MwDrawer } from "../mw-drawer";

describe('mw-drawer', () => {

	it("getAvailableRoutes()", () => {

		expect(MwDrawer.getAvailableRoutes([1, 2, 3, 4], [
			{ type: "divider", attribute: [1, 2], }, 
			{ type: 'route', data: { routeLink: '/asd', label: "route" } },
		])).toEqual([
			{ type: "divider", attribute: [1, 2], }, 
			{ type: 'route', data: { routeLink: '/asd', label: "route" } },
		]);

		expect(MwDrawer.getAvailableRoutes([4], [
			{ type: "divider", attribute: [1, 2], }, 
			{ type: 'route', data: { routeLink: '/asd', label: "route" } },
		])).toEqual([
			{ type: 'route', data: { routeLink: '/asd', label: "route" } },
		]);

		expect(MwDrawer.getAvailableRoutes([1, 2, 3, 4], [
			{ type: "divider", attribute: [1, 2], notAttribute: [4], }, 
			{ type: 'route', notAttribute: [1], data: { routeLink: '/asd', label: "route" } },
		])).toEqual([]);
		

		// check collection
		const obj = [
			{ type: "divider", attribute: [2], notAttribute: [1], }, 
			{ type: 'collection', attribute: [1, 2], notAttribute: [4], data: {label: 'hello', items: [
				{ type: 'route', notAttribute: [1], data: { routeLink: '/asd', label: "route" } },
			]}, }, 
		];
		const str = JSON.stringify(obj);
		expect(MwDrawer.getAvailableRoutes([1, 2, 3], obj as any)).toEqual([]);
		// be sure that when the collection childs are filtered,
		// that the original array is not altered
		expect(JSON.stringify(obj)).toBe(str);


		expect(MwDrawer.getAvailableRoutes([1, 2, 3], [
			{ type: 'collection', attribute: [1, 2], notAttribute: [4], data: {label: 'hello', items: [
				{ type: 'collection', attribute: [1, 2], notAttribute: [4], data: {label: 'hello', items: [
					{ type: 'collection', attribute: [1, 2], notAttribute: [4], data: {label: 'hello', items: [
						
					]}, }, 
				]}, }, 	
			]}, }, 
		])).toEqual([]);

	});

});

import { AbstractEditorLogic } from "../abstract-editor.logic";
import {  LibAttribute } from "../../../utils/enums/default-enums.enum";
import { BePaths, BePaths as LibBePaths } from '../../../utils/enums/bepaths.enum';
import { AuthService } from "../../../services/authentication/authentication";
import { SelectFieldValue } from "../../fields/dtd";
import { Helpers } from "../../../utils/various/helpers";
import { TopLevelEditorPart, IEditorLogicPart, FormArrayPart } from "../dtd/editor-parts.dtd";
import { FormControl, FormGroup, FormArray, Validators } from "react-reactive-form";
import { FetchableField } from "../../../services/controllers/dtd";
import { BaseField } from "../dtd/fields.dtd";
import { RouterService } from "../../../services/router/router-service";
import { AbstractDbItemController } from "../../../services/controllers/abstract-db-item.controller";
import { BusinessLocationsService } from "../../../services/business/business-locations.service";
import { BusinessLocation } from "../../../services/context-service/context.dtd";

const getController = (bp: BePaths) => {
	class Contr extends AbstractDbItemController<any> {
		bePath = bp;
		fetchInfo = {};
		modelClass = '';
	}
	return new Contr();
}

RouterService['reactRouter'] = {
	match: {} as any,
} as any;

class EditorLogicInstance extends AbstractEditorLogic<any> {
	// TODO test for this
	requirePhysicalLocation = false;
	controller = getController(LibBePaths.userlist);
	generateEditorSettings() { return []; }
	setState(v, c) { return c && c(); }
}

const editor = new EditorLogicInstance({} as any);

describe("AbstractEditorLogic abstract-editor.logic.ts", () => {

	describe("setInitialData()", () => {

		it("calls Helpers.checkAttributes() with settings passed", async () => {
			const fn = jest.spyOn(Helpers, 'checkAttributes');
			fn.mockClear();
			
			await editor['setInitialData']().toPromise();

			expect(fn).toHaveBeenCalledTimes(1);
			expect(fn).toHaveBeenLastCalledWith(editor['cache'].editorSettings);

			fn.mockRestore();
		});

	});

	describe("getCurrKey()", () => {

		const testFn = (s: TopLevelEditorPart<any>, recursivePath?: string) => {
			return editor['getCurrKey'](s, recursivePath);
		}

		it('skips non logic items (cut,  jsx, divider)', () => {
			expect(testFn({type: 'cut'})).toBe(undefined);
			expect(testFn({type: 'jsx', component: (null)})).toBe(undefined);
			expect(testFn({type: 'divider'})).toBe(undefined);

			expect(testFn({type: 'abstractControl', logic: {key: 'a'}} as any)).toBe("a");
			expect(testFn({type: 'formArray', logic: {key: 'a'}} as any)).toBe("a");
			expect(testFn({type: 'formGroup', logic: {key: 'a'}} as any)).toBe("a");
			expect(testFn({type: 'formControl', logic: {key: 'a'}} as any)).toBe("a");
		});

		it("returns the concatenated recursive path with the serrings key given", () => {
			// test with parent just to be safe
			expect(testFn({type: 'abstractControl', logic: {key: 'a'}} as any, "b")).toBe("b.a");
			expect(testFn({type: 'formControl', logic: {key: 'a'}} as any, "b.a.c")).toBe("b.a.c.a");
			expect(testFn({type: 'formArray', logic: {key: 'a'}} as any, "b.a.c")).toBe("b.a.c.a");
			expect(testFn({type: 'formGroup', logic: {key: 'a'}} as any, "b.a.c")).toBe("b.a.c.a");
		});

		it("returns the recursivePath given as is if it points to a child of a formarray that doesnt genereate a formgroup for the items", () => {
		
			// there is no parent
			expect(testFn(
				{
					type: 'formControl', 
					logic: {key: 'a'}
				} as any, 
			"b.a.c"
			)).toBe("b.a.c.a");

			// only 1 logic item
			expect(testFn(
				{
					parent: {type: 'formArray', logic: {key: 'x', parts: [
						{type: 'formControl'}, {type: 'jsx'}, {type: 'cut'}, {type: 'divider'}, 
					]}}, 
					type: 'formControl', 
					logic: {key: 'a'}
				} as any, 
			"b.a.c"
			)).toBe("b.a.c");
			expect(testFn(
				{
					parent: {type: 'formArray', logic: {key: 'x', parts: [
						{type: 'abstractControl'}, {type: 'jsx'}
					]}}, 
					type: 'formControl', 
					logic: {key: 'a'}
				} as any, 
			"b.a.c"
			)).toBe("b.a.c");

			expect(testFn(
				{
					parent: {type: 'formArray', logic: {key: 'x', parts: [
						{type: 'formArray'}, {type: 'jsx'}
					]}}, 
					type: 'formControl', 
					logic: {key: 'a'}
				} as any, 
			"b.a.c"
			)).toBe("b.a.c");
			expect(testFn(
				{
					parent: {type: 'formArray', logic: {key: 'x', parts: [
						{type: 'formGroup'}, {type: 'jsx'}
					]}}, 
					type: 'formControl', 
					logic: {key: 'a'}
				} as any, 
			"b.a.c"
			)).toBe("b.a.c");



			// the parent contains multiple logic items
			// we don't have to test every combination here as the tests above has ensured that all
			// different logic controls are considered as logic
			expect(testFn(
				{
					parent: {type: 'formArray', logic: {key: 'x', parts: [
						{type: 'formControl'},
						{type: 'formControl'},
					]}}, 
					type: 'formControl', 
					logic: {key: 'a'}
				} as any, 
			"b.a.c"
			)).toBe("b.a.c.a");


			// force formGroup
			expect(testFn(
				{
					parent: {type: 'formArray', logic: {key: 'x', forceFormGroup: true, parts: [{type: 'formControl'},]}}, 
					type: 'formControl', 
					logic: {key: 'a'}
				} as any, 
			"b.a.c"
			)).toBe("b.a.c.a");


			// ensure it works only if the parent is formArray
			expect(testFn(
				{
					parent: {type: 'formGroup', logic: {key: 'x', parts: [{type: 'formControl'},]}}, 
					type: 'formControl', 
					logic: {key: 'a'}
				} as any, 
			"b.a.c"
			)).toBe("b.a.c.a");


		});

	});

	describe.skip("addFields()", () => {

		const getControlPhyLoc = () =>
			({type: 'abstractControl', logic: {key: 'physicalLocation'}});
		const getControlDocLoc = () =>
			({type: 'abstractControl', logic: {key: 'documentLocation'}});
		const getControlDocLocFil = () =>
			({type: 'abstractControl', logic: {key: 'documentLocationsFilter'}});


		const getFieldDocLoc = (vals: SelectFieldValue[]) => 
			({type: 'formControl', logic: expect.objectContaining({key: 'documentLocation', values: vals, component: 'SelectField', label: 'Creato in'})});
		const getFieldDocFil = (vals: SelectFieldValue[], addGlobal?: boolean) => 
			({type: 'formControl', logic: expect.objectContaining({key: 'documentLocationsFilter', values: addGlobal ? [{value: "*", label: "GLOBALE"}, ...vals] : vals, component: 'MultiSelectField', label: "Visibilita' elemento"})});
	
		const testFn = (a?: TopLevelEditorPart<any>[], objToSet?: any, editorToUse: any = editor) => {
			editorToUse['objFromBe'] = objToSet;
			editorToUse['addFields'](a);
			(a as any).forEach(a => a && a.logic && delete a.logic.control);
			return a;
		};

		const setLocs = (arr: BusinessLocation[]) => {
			tt.setupLocations(arr);
		};

		it.todo('add physical location')
		
		it("adds the docLoc parts based on the editor property", () => {
			setLocs([{_id: "1", isActive: true, name: "1"}, {_id: "2", isActive: true, name: "1"}]);

			class TrueEd extends AbstractEditorLogic<any> {
				controller = getController(LibBePaths.userlist);
				generateEditorSettings() { return []; }
				// TODO test this
				requirePhysicalLocation = false;
				requireDocumentLocation = true;
				requireDocumentLocationsFilter = true;
			}
			let obj = [];
			let res = testFn(obj, undefined, new TrueEd({} as any));
			expect(res.find(t => t.type === 'formControl' && t.logic.key === 'documentLocation' && (t.logic as BaseField).required === true)).toBeTruthy();
			expect(res.find(t => t.type === 'formControl' && t.logic.key === 'documentLocationsFilter' && (t.logic as BaseField).required === true)).toBeTruthy();



			class FalseEd extends AbstractEditorLogic<any> {
				controller = getController(LibBePaths.userlist);
				// TODO test this
				requirePhysicalLocation = false;
				generateEditorSettings() { return []; }
				requireDocumentLocation = false;
				requireDocumentLocationsFilter = false;
			}
			obj = [];
			res = testFn(obj, undefined, new FalseEd({} as any));
			expect(obj).toHaveLength(0);

				

			class UndefinedEd extends AbstractEditorLogic<any> {
				controller = getController(LibBePaths.userlist);
				generateEditorSettings() { return []; }
				// TODO test this
				requirePhysicalLocation = false;
				requireDocumentLocation = undefined;
				requireDocumentLocationsFilter = undefined;
			}
			obj = [];
			res = testFn(obj, undefined, new UndefinedEd({} as any));
			expect(res.find(t => t.type === 'formControl' && t.logic.key === 'documentLocation' && (t.logic as BaseField).required !== true)).toBeTruthy();
			expect(res.find(t => t.type === 'formControl' && t.logic.key === 'documentLocationsFilter' && (t.logic as BaseField).required !== true)).toBeTruthy();


		});

		it("the available values for docVis and docLoc are correct", () => {
	
			// no global vis
			AuthService.isAttributePresent = a => a !== LibAttribute.canSetGlobalLocFilter;
			setLocs([ {_id: "1", name: "1", isActive: true}]);
			expect(testFn([])).toEqual([
				// no ui fields
				// getControlPhyLoc(),
				getControlDocLocFil(),
				getControlDocLoc(),
			]);
	
			// global vis with 1 location
			AuthService.isAttributePresent = a => true;
			// only docLocFilter field
			expect(testFn([])).toEqual([
				// getControlPhyLoc(),
				getControlDocLoc(),
				{type: 'divider'},
				getFieldDocFil([{value: "1", label: "1"}], true),
			]);
	
			AuthService.isAttributePresent = a => a !== LibAttribute.canSetGlobalLocFilter;
			setLocs([
				{_id: "1", name: "1", isActive: true},
				{_id: "2", name: "2", isActive: true},
				{_id: "3", name: "3", isActive: false},
			]);
			expect(testFn([])).toEqual([
				{type: 'divider'},
				// getControlPhyLoc(),
				// everyone show multiple places yee
				getFieldDocLoc([{value: "1", label: "1"}, {value: "2", label: "2"}]),
				getFieldDocFil([{value: "1", label: "1"}, {value: "2", label: "2"}]),
			]);
	
		});

		it("the values from the obj are added to select", () => {
	
			expect(testFn([], {documentLocationsFilter: ['*']})).toEqual([
				{type: 'divider'},
				getFieldDocLoc([{value: "1", label: "1"}, {value: "2", label: "2"}]),
				getFieldDocFil([{value: "1", label: "1"}, {value: "2", label: "2"}], true),
			]);
	
			expect(testFn([], {documentLocationsFilter: ['_id_', '_id2_']})).toEqual([
				{type: 'divider'},
				getFieldDocLoc([{value: "1", label: "1"}, {value: "2", label: "2"}]),
				getFieldDocFil([
					{value: "1", label: "1"}, 
					{value: "2", label: "2"}, 
					{value: "_id_", label: "Altra Posizione #1"},
					{value: "_id2_", label: "Altra Posizione #2"},
				]),
			]);
	
			expect(testFn([], {documentLocation: "_id_"})).toEqual([
				{type: 'divider'},
				getFieldDocLoc([{value: "1", label: "1"}, {value: "2", label: "2"}, {value: "_id_", label: "Altra Posizione"}]),
				getFieldDocFil([{value: "1", label: "1"}, {value: "2", label: "2"}]),
			]);
	
			// test disabled location
			expect(testFn([], {documentLocation: "3"})).toEqual([
				{type: 'divider'},
				getFieldDocLoc([{value: "1", label: "1"}, {value: "2", label: "2"}, {value: "3", label: "3"}]),
				getFieldDocFil([{value: "1", label: "1"}, {value: "2", label: "2"}]),
			]);
	
		});

		it("the divider from the other fields is added correctly", () => {
	
			AuthService.isAttributePresent = () => true;
			BusinessLocationsService.updateByBusiness({
				locations: [
					{ _id: "1", name: "1", isActive: true },
					{ _id: "2", name: "2", isActive: true },
				]
			} as any)
			const docLoc = getFieldDocLoc([{value: "1", label: "1"}, {value: "2", label: "2"}]);
			const docVis = getFieldDocFil([{value: "1", label: "1"}, {value: "2", label: "2"}], true);
	
			expect(testFn([])).toEqual([
				{type: 'divider'}, docLoc, docVis,
			]);
	
			expect(testFn([{type: "cut"}])).toEqual([
				{type: 'cut'}, docLoc, docVis,
			]);
	
			expect(testFn([{type: "divider"}])).toEqual([
				{type: 'divider'}, docLoc, docVis,
			]);
	
			expect(testFn([{type: "formControl"} as any])).toEqual([
				{type: 'formControl'}, {type: 'divider'}, docLoc, docVis,
			]);
		});
	
		it("cant CHANGE doc visibliity if there is not auth", () => {
			AuthService.isAttributePresent = a => a !== LibAttribute.canChangeDocLocFilter;
	
			expect(testFn([], {})).toEqual([
				getControlDocLocFil(),
				{type: 'divider'},
				getFieldDocLoc([{value: "1", label: "1"}, {value: "2", label: "2"}]),
			]);
	
			expect(testFn([])).toEqual([
				{type: 'divider'},
				getFieldDocLoc([{value: "1", label: "1"}, {value: "2", label: "2"}]),
				getFieldDocFil([{value: "1", label: "1"}, {value: "2", label: "2"}], true),
			]);
	
		});

	});

	describe("validateEditorSettings()", () => {

		let obj: TopLevelEditorPart<any>[]; 

		const testFn = (settings: TopLevelEditorPart<any>[]) => {
			editor['validateEditorSettings'](settings);
		};

		it("throws when there are same keys in the same formArray/formGroup", () => {

			const t = (s: TopLevelEditorPart<any>[]) => {
				expect(() => testFn(s)).toThrow();
			}
			const nt = (s: TopLevelEditorPart<any>[]) => {
				expect(() => testFn(s)).not.toThrow();
			}

			// not to throw

			nt([]);
			nt([
				{type: "formGroup", logic: {key: "item1", parts: [
					{type: 'divider'},
					{type: 'formGroup', logic: {key: "item1.1", parts: [
						{type: "formControl", logic: {key: "item1.1.1", component: 'TextField', label: "label"}}
					]}},
				], }},
				{type: "formArray", logic: {key: "item2", parts: [
					{type: 'formControl', logic: {key: "item2.1", component: "TextField", label: "label"}},
				]}},
				{type: "formArray", logic: {key: "item3", parts: [
					{type: 'divider'},
					{type: 'formGroup', logic: {key: "item3.1", parts: [
						{type: "formControl", logic: {key: "item3.1.1", component: 'TextField', label: "label"}}
					]}},
				]}},
			] as TopLevelEditorPart<any>[]);

			nt([
				{type: "formGroup", logic: {key: "1", parts: [
					{type: "formControl", logic: {key: "1", component: 'TextField', label: "label"}},
					{type: "formControl", logic: {key: "2", component: 'TextField', label: "label"}},
				]}},
				{type: "formGroup", logic: {key: "2", parts: [
					{type: "formControl", logic: {key: "1", component: 'TextField', label: "label"}},
					{type: "formGroup", logic: {key: "2", parts: [
						{type: "formControl", logic: {key: "1", component: 'TextField', label: "label"}},
					]}},
				]}},
			] as TopLevelEditorPart<any>[]);
			nt([
				{type: "formArray", logic: {key: "1", parts: [
					{type: "formControl", logic: {key: "1", component: 'TextField', label: "label"}},
					{type: "formControl", logic: {key: "2", component: 'TextField', label: "label"}},
					{type: "formControl", logic: {key: "3", component: 'TextField', label: "label"}},
				]}},
			] as TopLevelEditorPart<any>[])


			// throw
			t([
				{type: "formControl", logic: {key: "1", component: 'TextField', label: "label"}},
				{type: "formControl", logic: {key: "1", component: 'TextField', label: "label"}},
			]);

			t([
				{type: "formGroup", logic: {key: "1", parts: [
					{type: "formControl", logic: {key: "1", component: 'TextField', label: "label"}},
					{type: "formControl", logic: {key: "1", component: 'TextField', label: "label"}},
				]}},
				{type: "formGroup", logic: {key: "2", parts: [
					{type: "formControl", logic: {key: "1", component: 'TextField', label: "label"}},
					{type: "formGroup", logic: {key: "2", parts: [
						{type: "formControl", logic: {key: "1", component: 'TextField', label: "label"}},
					]}},
				]}},
			] as TopLevelEditorPart<any>[]);

			t([
				{type: "formArray", logic: {key: "2", parts: [
					{type: "formControl", logic: {key: "1", component: 'TextField', label: "label"}},
					{type: "formControl", logic: {key: "1", component: 'TextField', label: "label"}},
				]}},
			] as TopLevelEditorPart<any>[])
		});

		it("references the parent inside the child", () => {
			obj = [
				{type: "formGroup", logic: {key: "item1", parts: [
					{type: 'divider'},
					{type: 'formGroup', logic: {key: "item1.1", parts: [
						{type: "formControl", logic: {key: "item1.1.1", component: 'TextField', label: "label"}}
					]}},
				], }},
				{type: "formArray", logic: {key: "item2", parts: [
					{type: 'formControl', logic: {key: "item2.1", component: "TextField", label: "label"}},
				]}},
				{type: "formArray", logic: {key: "item3", parts: [
					{type: 'divider'},
					{type: 'formGroup', logic: {key: "item3.1", parts: [
						{type: "formControl", logic: {key: "item3.1.1", component: 'TextField', label: "label"}}
					]}},
				]}},
			] as TopLevelEditorPart<any>[];

			testFn(obj);
			// TODO fix "as any"

			expect(obj[0].parent).toBe(undefined);
			expect((obj[0] as any).logic.parts[0].parent).toBe(obj[0]);
			expect((obj[0] as any).logic.parts[1].parent).toBe(obj[0]);
			expect((obj[0] as any).logic.parts[1].logic.parts[0].parent).toBe((obj[0] as any).logic.parts[1]);
		
			expect(obj[1].parent).toBe(undefined);
			expect((obj[1] as any).logic.parts[0].parent).toBe(obj[1]);

			expect(obj[2].parent).toBe(undefined);
			expect((obj[2] as any).logic.parts[0].parent).toBe(obj[2]);
			expect((obj[2] as any).logic.parts[1].parent).toBe(obj[2]);
			expect((obj[2] as any).logic.parts[1].logic.parts[0].parent).toBe((obj[2] as any).logic.parts[1]);

		});

	});

	describe("generateDataForAbstractControl()", () => {

		const testFn = (objFromBe: any, setts: TopLevelEditorPart<any>[]) => {
			// validate and add parent ref
			editor['validateEditorSettings'](setts);
			return new FormGroup(editor['generateDataForAbstractControl'](objFromBe, setts)).value;
		};

		it("returns an empty object if no logic controls were given", () => {
			expect(testFn({}, [])).toEqual({});

			expect(testFn({}, [
				{type: "cut"},
				{type: "divider"},
				{type: "jsx", component: () => (null)},
				{type: "divider"},
			] as TopLevelEditorPart<any>[])).toEqual({});

			expect(testFn({}, [
				{type: "cut"},
				{type: "divider"},
				{type: "jsx", component: () => (null)},
				{type: 'formControl', logic: {key: "a", label: "b"}},
				{type: "divider"},
			] as TopLevelEditorPart<any>[])).toEqual({a: undefined});

		});

		it("processes all the logic parts ignoring ONLY the non logic parts (cut/divider/jsx)", () => {
			expect(testFn({}, [])).toEqual({});

			expect(testFn({}, [
				{type: "cut"},
				{type: "divider"},
				{type: "jsx", component: () => (null)},
				{type: "divider"},
			] as TopLevelEditorPart<any>[])).toEqual({});

			expect(testFn({}, [
				{type: "cut"},
				{type: "divider"},
				{type: 'formControl', logic: {key: "a", label: "b"}},
			
				{type: 'formGroup', logic: {key: "c", label: "b", parts: [
					{type: 'formGroup', logic: {key: "a", label: "b", parts: [
						{type: 'formArray', logic: {key: "a", label: "b", parts: [
							{type: 'formControl', logic: {key: "a", label: "b"}},
						]}},
					]}},
				]}},
				{type: "jsx", component: () => (null)},
				{type: "abstractControl", logic: {key: "d", control: new FormControl(1)}},
				{type: "divider"},
				{type: 'formArray', logic: {key: "b", label: "b", parts: [
					{type: 'formControl', logic: {key: "a", label: "b"}},
				]}},
			] as TopLevelEditorPart<any>[])).toEqual({
				a: undefined,
				c: {
					a: {
						a: []
					}
				},
				d: 1,
				b: []
			});

		});

		it("Uses the manual value given for formControl instead of the automatic one", () => {
			// ensure the value from the obj is taken
			expect(testFn({}, [
				{type: 'formControl', logic: {key: "a", label: "b"}},
			] as TopLevelEditorPart<any>[])).toEqual({a: undefined});

			expect(testFn({
				a: 10
			}, [
				{type: 'formControl', logic: {key: "a", label: "b"}},
			] as TopLevelEditorPart<any>[])).toEqual({a: 10});

			expect(testFn({
				a: 10
			}, [
				{type: 'formControl', logic: {key: "a", label: "b", value: 20}},
			] as TopLevelEditorPart<any>[])).toEqual({a: 20});

			expect(testFn({
				a: {
					b: 10
				}
			}, [
				{type: "formGroup", logic: {key: 'a', parts: [
					{type: 'formControl', logic: {key: "b", label: "b"}},
				]}}
			] as TopLevelEditorPart<any>[])).toEqual({a: {b: 10}});

			expect(testFn({
				a: {
					b: 10
				}
			}, [
				{type: "formGroup", logic: {key: 'a', parts: [
					{type: 'formControl', logic: {key: "b", label: "b", value: 20}},
				]}}
			] as TopLevelEditorPart<any>[])).toEqual({a: {b: 20}});

			expect(testFn({
				a: {
					b: [
						10,
						20,
						30
					]
				}
			}, [
				{type: "formGroup", logic: {key: 'a', parts: [
					{type: "formArray", logic: {key: 'b', parts: [
						{type: 'formControl', logic: {key: "", label: "b"}},
					]}}
				]}}
			] as TopLevelEditorPart<any>[])).toEqual({a: {b: [10, 20, 30]}});

			expect(testFn({
				a: {
					b: [
						10,
						20,
						30
					]
				}
			}, [
				{type: "formGroup", logic: {key: 'a', parts: [
					{type: "formArray", logic: {key: 'b', parts: [
						{type: 'formControl', logic: {key: "", label: "b", value: 20}},
					]}}
				]}}
			] as TopLevelEditorPart<any>[])).toEqual({a: {b: [20, 20, 20]}});


		});

		it("Uses the manual control instead of generating an automatic one", () => {
			
			// to verify that it uses a given fromControl/formGroup/formArray we can simply yeet
			// a custom value inside the abstractControl and then expect that value to be in the

			expect(testFn({}, [
				{type: "formArray", logic: {key: "a", min: 2, parts: [
					{type: "formGroup", logic: {key: "b", parts: [
						{type: "formControl", logic: {key: "c", component: "TextField", label: 'd'}},
						{type: "formControl", logic: {key: "e", component: "TextField", label: 'd'}},
					]}}
				]}},
				{type: "formGroup", logic: {key: "b", parts: [
					{type: "formControl", logic: {key: "c", component: "TextField", label: 'd'}},
					{type: "formControl", logic: {key: "e", component: "TextField", label: 'd'}},
				]}},
				{type: "formControl", logic: {key: "c", component: "TextField", label: 'd'}},
			] as TopLevelEditorPart<any>[])).toEqual({
				a: [
					{
						c: undefined,
						e: undefined,
					},
					{
						c: undefined,
						e: undefined,
					}
				],
				b: {
					c: undefined,
					e: undefined,
				},
				c: undefined,
			});

			// try only lowest level
			expect(testFn({}, [
				{type: "formArray", logic: {key: "a", min: 2, parts: [
					{type: "formGroup", logic: {key: "b", parts: [
						{type: "formControl", logic: {key: "c", component: "TextField", control: new FormControl(1), label: 'd'}},
						{type: "formControl", logic: {key: "e", component: "TextField", control: new FormControl(1), label: 'd'}},
					]}}
				]}},
				{type: "formGroup", logic: {key: "b", parts: [
					{type: "formControl", logic: {key: "c", component: "TextField", control: new FormControl(1), label: 'd'}},
					{type: "formControl", logic: {key: "e", component: "TextField", control: new FormControl(1), label: 'd'}},
				]}},
				{type: "formControl", logic: {key: "c", component: "TextField", control: new FormControl(1), label: 'd'}},
			] as TopLevelEditorPart<any>[])).toEqual({
				a: [
					{
						c: 1,
						e: 1,
					},
					{
						c: 1,
						e: 1,
					}
				],
				b: {
					c: 1,
					e: 1,
				},
				c: 1,
			});


			// go higher
			expect(testFn({}, [
				{type: "formArray", logic: {key: "a", min: 2, parts: [
					{type: "formGroup", logic: {key: "b", control: new FormGroup({d: new FormControl(1)}), parts: [
						{type: "formControl", logic: {key: "c", component: "TextField", control: new FormControl(1), label: 'd'}},
						{type: "formControl", logic: {key: "e", component: "TextField", control: new FormControl(1), label: 'd'}},
					]}}
				]}},
				{type: "formGroup", logic: {key: "b", control: new FormGroup({d: new FormControl(1)}), parts: [
					{type: "formControl", logic: {key: "c", component: "TextField", control: new FormControl(1), label: 'd'}},
					{type: "formControl", logic: {key: "e", component: "TextField", control: new FormControl(1), label: 'd'}},
				]}},
				{type: "formControl", logic: {key: "c", component: "TextField", control: new FormControl(1), label: 'd'}},
			] as TopLevelEditorPart<any>[])).toEqual({
				a: [
					{
						d: 1
					},
					{
						d: 1
					}
				],
				b: {
					d: 1,
				},
				c: 1,
			});

			// go higher
			expect(testFn({}, [
				{type: "formArray", logic: {key: "a", min: 2, control: new FormArray([new FormGroup({d: new FormControl(1)})]), parts: [
					{type: "formGroup", logic: {key: "b", control: new FormGroup({d: new FormControl(1)}), parts: [
						{type: "formControl", logic: {key: "c", component: "TextField", control: new FormControl(1), label: 'd'}},
						{type: "formControl", logic: {key: "e", component: "TextField", control: new FormControl(1), label: 'd'}},
					]}}
				]}},
				{type: "formGroup", logic: {key: "b", control: new FormGroup({d: new FormControl(1)}), parts: [
					{type: "formControl", logic: {key: "c", component: "TextField", control: new FormControl(1), label: 'd'}},
					{type: "formControl", logic: {key: "e", component: "TextField", control: new FormControl(1), label: 'd'}},
				]}},
				{type: "formControl", logic: {key: "c", component: "TextField", control: new FormControl(1), label: 'd'}},
			] as TopLevelEditorPart<any>[])).toEqual({
				a: [
					{d: 1}
				],
				b: {
					d: 1,
				},
				c: 1,
			});

		});

		describe("formArray", () => {

			it("Adds automatic generateControl if manual not given", () => {
				let s: TopLevelEditorPart<any>[] = [
					{type: 'formArray', logic: {key: "a", parts: [
						{type: "formControl", logic: {key: "b", label: "1", component: "TextField"}},
					]}}
				] as TopLevelEditorPart<any>[];

				expect(typeof (s[0] as FormArrayPart<any>).logic.generateControl).toBe('undefined');
				testFn({}, s);
				expect(typeof (s[0] as FormArrayPart<any>).logic.generateControl).toBe('function');
				
				// ensure it adds the automatic  thingy even if explicit control is specificed
				s = [
					{type: 'formArray', logic: {key: "a", control: new FormArray([]), parts: [
						{type: "formControl", logic: {key: "b", label: "1", component: "TextField"}},
					]}}
				] as TopLevelEditorPart<any>[];

				expect(typeof (s[0] as FormArrayPart<any>).logic.generateControl).toBe('undefined');
				testFn({}, s);
				expect(typeof (s[0] as FormArrayPart<any>).logic.generateControl).toBe('function');
				

				// manual give
				s = [
					{type: 'formArray', logic: {key: "a", generateControl: () => new FormArray([]), parts: [
						{type: "formControl", logic: {key: "b", label: "1", component: "TextField"}},
					]}}
				] as TopLevelEditorPart<any>[];

				testFn({}, s);
				// expect it to be the same function
				expect((s[0] as FormArrayPart<any>).logic.generateControl)
					.toBe((s[0] as FormArrayPart<any>).logic.generateControl);


			});

			it("fills the formArray to the min required amount (if given)", () => {
				expect(testFn({}, [
					{type: 'formArray', logic: {key: "a", parts: [
						{type: "formControl", logic: {key: "b", label: "1", component: "TextField"}},
					]}}
				] as TopLevelEditorPart<any>[])).toEqual({
					a: [],
				});

				expect(testFn({}, [
					{type: 'formArray', logic: {key: "a", min: 5, parts: [
						{type: "formControl", logic: {key: "b", label: "1", component: "TextField"}},
					]}}
				] as TopLevelEditorPart<any>[])).toEqual({
					a: [undefined, undefined, undefined, undefined, undefined],
				});

				expect(testFn({
					a: [1, 2, 3]
				}, [
					{type: 'formArray', logic: {key: "a", min: 5, parts: [
						{type: "formControl", logic: {key: "b", label: "1", component: "TextField"}},
					]}}
				] as TopLevelEditorPart<any>[])).toEqual({
					a: [1, 2, 3, undefined, undefined],
				});

				expect(testFn({
				}, [
					{type: 'formArray', logic: {key: "a", min: 5, forceFormGroup: true, parts: [
						{type: "formControl", logic: {key: "b", label: "1", component: "TextField"}},
					]}}
				] as TopLevelEditorPart<any>[])).toEqual({
					a: [{b: undefined}, {b: undefined}, {b: undefined}, {b: undefined}, {b: undefined}],
				});
				
				expect(testFn({
					a: [{b: {s: 1}}]
				}, [
					{type: 'formArray', logic: {key: "a", min: 5, forceFormGroup: true, parts: [
						{type: "formControl", logic: {key: "b", label: "1", component: "TextField"}},
					]}}
				] as TopLevelEditorPart<any>[])).toEqual({
					a: [{b: {s: 1}}, {b: undefined}, {b: undefined}, {b: undefined}, {b: undefined}],
				});
				
			});

			describe("automatic generateControl function", () => {

				// differen variations of the logic to expect
				let s: TopLevelEditorPart<any>[] = [
					{type: 'formArray', logic: {key: "a", parts: [
						{type: "formControl", logic: {key: "a", label: "1", component: "TextField"}},
					]}},
					{type: 'formArray', logic: {key: "b", forceFormGroup: true, parts: [
						{type: "formControl", logic: {key: "a", label: "1", component: "TextField"}},
					]}},
					{type: 'formArray', logic: {key: "c", parts: [
						{type: "formControl", logic: {key: "a", label: "1", component: "TextField"}},
						{type: "formControl", logic: {key: "b", label: "1", component: "TextField"}},
					]}},
					{type: 'formArray', logic: {key: "d", parts: [
						{type: 'formGroup', logic: {key: "c", parts: [
							{type: "formControl", logic: {key: "a", label: "1", component: "TextField"}},
							{type: "formControl", logic: {key: "b", label: "1", component: "TextField"}},
						]}},
					]}},
				] as TopLevelEditorPart<any>[];

				// process to get the automatic functions
				testFn({}, s);
				expect(typeof (s[0] as FormArrayPart<any>).logic.generateControl).toBe('function');
				expect(typeof (s[1] as FormArrayPart<any>).logic.generateControl).toBe('function');
				expect(typeof (s[2] as FormArrayPart<any>).logic.generateControl).toBe('function');
				expect(typeof (s[3] as FormArrayPart<any>).logic.generateControl).toBe('function');
				// get all the different type of fns
				const oneFormControlNoForce = (s[0] as FormArrayPart<any>).logic.generateControl;
				const oneFormControlForce = (s[1] as FormArrayPart<any>).logic.generateControl;
				const twoFormControl = (s[2] as FormArrayPart<any>).logic.generateControl;
				const oneFormGroupWithFormControlChildsNoForce = (s[3] as FormArrayPart<any>).logic.generateControl;


				it("returns a formControl instead of formGroup by the settings logic", () => {
					expect(oneFormControlNoForce().value).toEqual(undefined);
					expect(oneFormControlForce().value).toEqual({a: undefined});
					expect(twoFormControl().value).toEqual({a: undefined});
					expect(oneFormGroupWithFormControlChildsNoForce().value).toEqual({a: undefined, b: undefined});
				});


				it("creates the formArray row data by calling the same function recursevly", () => {
					let s: TopLevelEditorPart<any>[] = [
						{type: 'formArray', logic: {key: "a", parts: [
							{type: "formControl", logic: {key: "b", label: "1", component: "TextField"}},
						]}}
					] as TopLevelEditorPart<any>[];
	
					// process to get the automatic function
					testFn({}, s);
					expect(typeof (s[0] as FormArrayPart<any>).logic.generateControl).toBe('function');
					// as the formArray does not force the child to be a formGroup, we have a formControl return value
					const generateFormControlFn = (s[0] as FormArrayPart<any>).logic.generateControl;

					const fn = jest.spyOn(editor, 'generateDataForAbstractControl' as any);
					fn.mockClear();
					expect(fn).toHaveBeenCalledTimes(0);
					generateFormControlFn(10);
					expect(fn).toHaveBeenCalledTimes(1);
					expect(fn).toHaveBeenLastCalledWith(10, (s[0] as FormArrayPart<any>).logic.parts);
					fn.mockRestore();
				});

			});

		});

	});

	describe("getValidatorsFromEditorPart()", () => {

		const testFn = (obj: IEditorLogicPart<any>) => {
			return editor['getValidatorsFromEditorPart'](obj);
		}

		it("returns undefined, single validator, or array of validators, depenedning on amount of validators", () => {
			// no validators
			expect(testFn(
				{type: "formControl", logic: {key: "a", label: "a", component: "TextField"}}
			)).toBe(undefined);

			// single validator so NOT array
			expect(testFn(
				{type: "formControl", logic: {key: "a", label: "a", component: "TextField", validators: [Validators.min(2)]}}
			)).toBeTruthy();
			expect(testFn(
				{type: "formControl", logic: {key: "a", label: "a", component: "TextField", validators: [Validators.min(2)]}}
			)).not.toBe(expect.any(Array));

			// array
			expect(testFn(
				{type: "formControl", logic: {key: "a", label: "a", component: "TextField", validators: [Validators.min(2), Validators.max(3)]}}
			)).toHaveLength(2);

		});


		it("adds basic validators for price/number field", () => {
			expect(testFn(
				{type: "formControl", logic: {key: "a", label: "a", component: "NumberField"}}
			)).toBeTruthy()

			expect(testFn(
				{type: "formControl", logic: {key: "a", label: "a", component: "NumberField", min: 10}}
			)).toHaveLength(2)

			expect(testFn(
				{type: "formControl", logic: {key: "a", label: "a", component: "NumberField", min: 10, max: 15}}
			)).toHaveLength(3)

			expect(testFn(
				{type: "formControl", logic: {key: "a", label: "a", component: "PriceField"}}
			)).toBeTruthy()

		});

		it("adds required / manual validators to the list", () => {
			expect(testFn(
				{type: "formControl", logic: {key: "a", label: "a", component: "TextField"}}
			)).toBe(undefined);

			expect(testFn(
				{type: "formControl", logic: {key: "a", label: "a", component: "TextField", required: true}}
			)).toBe(Validators.required);

			expect(testFn(
				{type: "formControl", logic: {key: "a", label: "a", component: "TextField", required: true, validators: [Validators.min(1)]}}
			)).toEqual([expect.anything(), Validators.required]);

			expect(testFn(
				{type: "formControl", logic: {key: "a", label: "a", component: "TextField", required: true, validators: [Validators.min(1), Validators.max(2)]}}
			)).toHaveLength(3)

			// special fields

			expect(testFn(
				{type: "formControl", logic: {key: "a", label: "a", component: "NumberField", min: 10, max: 15, required: true, validators: [Validators.min(1)]}}
			)).toHaveLength(5)

			expect(testFn(
				{type: "formControl", logic: {key: "a", label: "a", component: "PriceField", required: true, validators: [Validators.min(2)]}}
			)).toHaveLength(3)


		});
		
	});

	describe("fixObjBeforeSend()", () => {

		let o: any;
		const testFn = editor['fixObjBeforeSend'].bind(editor);

		it("adds docLocFilter if not present but docLoc present", () => {
			o = {};
			testFn(o);
			expect(o.documentLocationsFilter).toBe(undefined);

			o = {documentLocation: "1"};
			testFn(o);
			expect(o.documentLocationsFilter).toEqual(['1']);

			// it collapses to *
			o = {documentLocation: "1", documentLocationsFilter: ['1', '2', '*']};
			testFn(o);
			expect(o.documentLocationsFilter).toEqual(['*']);
		});

		it("removes .fetched fields from the fetchableFields", () => {

			const getFetchable = () => new FetchableField("a" , "a" , {});

			const noFetched = (o: object) => {
				for (const k in o) {
					if (o['fetched'] || (o[k] && o[k]['fetched'])) {
						throw new Error("Fetched Field Found");
					}
					if ((o[k] && typeof o[k] === 'object')) {
						noFetched(o[k]);
					}
				}
			};

			o = {
				f: getFetchable(),
				a: [
					{s: getFetchable()}, 
					getFetchable()
				],
				c: { d: {e: [{ g: getFetchable()}]}}
			} as any;

			testFn(o);
			noFetched(o);

		});

		describe("Clearing nullish fields", () => {

			// no objFromBE so it's in POST mode
			let intEditor = new EditorLogicInstance({} as any);
			let intTest = intEditor['fixObjBeforeSend'].bind(intEditor);
			
			let createBaseEditor = () => {
				intEditor = new EditorLogicInstance({} as any);
				intTest = intEditor['fixObjBeforeSend'].bind(intEditor);
			}
			let getBaseObj = () => ({
				k: "",
				a: null,
				b: { c: null, d: [null, undefined, null, {k: ""}, undefined,  null, null,] },
				c: { g: undefined, k: "", },
			});

			it("removes null|undefined values if in POST/PUT mode", () => {

				// post
				createBaseEditor();
				delete intEditor['objFromBe'];
				o = getBaseObj();
				intTest(o);
				expect(o).toEqual({
					b: {d: [{k: '',}]},
					c: {k: '',},
					k: '',
				});

				// ensure error for put check
				createBaseEditor();
				intEditor['objFromBe'] = {};
				o = getBaseObj();
				intTest(o);
				expect(o).not.toEqual({
					b: {d: [{k: '',}]},
					c: {k: '',},
					k: '',
				});

				// put
				createBaseEditor();
				intEditor['objFromBe'] = {};
				intEditor['config'].usePut = true;
				o = getBaseObj();
				intTest(o);
				expect(o).toEqual({
					b: {d: [{k: '',}]},
					c: {k: '',},
					k: '',
				});

			});
	
			it("keeps null|undefined values if in PATCH mode", () => {
	
				// post
				createBaseEditor();
				intEditor['objFromBe'] = {};
				o = getBaseObj();
				intTest(o);

				// array is always cleared
				let exp = getBaseObj();
				exp.b.d = [{k: ""}];

				expect(o).toEqual(exp);

			});
		});


	});

	describe("generatePatchOp()", () => {

		const testFn = editor['generatePatchOp'].bind(editor);

		it("ignores '.fetched' and '_' underscore prefixed paths differences", () => {
			expect(testFn({}, {})).toEqual([]);

			expect(testFn({
				a: { fetched: { g: 1 } },
				d: { _underscored: { g: 1 } },
				b: { nonFetched: { g: 1 } },
			}, {
				a: { fetched: { g: 2 } },
				d: { _underscored: { g: 2 } },
				b: { nonFetched: { g: 2 } },
			})).toEqual([
				{ op: "set", path: "b.nonFetched.g", value: 2 }
			]);

		});

		it("creates set patches only on fields with different non nullish values", () => {
			expect(testFn({
				a: { b: { g: 1 } },
				b: { d: [1, 2, 3] },
				e: { d: [{a: 1}, {a: 1}, {a: 1}]},
			}, {
				a: { b: { g: 2 } },
				b: { d: [1, 2, 3, 4] },
				e: { d: [{a: 1}, {a: 1}, {a: 2}]},
				c: { b: [1, 2], e: {g: 2, x: 1} },
			})).toEqual([
				{ op: "set", path: "a.b.g", value: 2 },
				{ op: "set", path: "b.d", value: [1, 2, 3, 4] },
				{ op: "set", path: "e.d", value: [{a: 1}, {a: 1}, {a: 2}] },

				// TODO fix this mess
				// { op: "set", path: "c", value: { b: [1, 2], e: {g: 2} } },
				{ op: "set", path: "c.b", value: [1, 2] },
				{ op: "set", path: "c.e.g", value: 2 },
				{ op: "set", path: "c.e.x", value: 1 },
			]);
		});

		it("creates unset patches only on fields that are nullish", () => {
			expect(testFn({
				a: { b: { g: 1 } },
				b: { d: [1, 2, 3] },
				e: { d: [{a: 1}, {a: 1}, {a: 1, c: 1}]},
				c: { b: [1, 2], e: {g: 2, x: 1} },
			}, {
				a: { b: { g: null } },
				b: { },
				e: { d: [{a: 1}, {a: 1}, {a: 1}]},
				c: { e: {g: 2, x: undefined} },
			})).toEqual([
				{ op: "unset", path: "a.b.g", value: "" },
				{ op: "unset", path: "b.d", value: "" },
				// arrays are specials
				{ op: "set", path: "e.d", value: [{a: 1}, {a: 1}, {a: 1}] },
				{ op: "unset", path: "c.b", value: "" },
				{ op: "unset", path: "c.e.x", value: "" },
			]);
		});

		// it("if arrays values changes it does a set regardless of changes", () => {

		// });

	});

	describe("send()", () => {
		
		it.todo("updates the formGroup valid state proceeds only if the formGorup state is valid");

		it.todo("calls the right post/put/patch function");

		it.todo("calls the fixObjBeforeSend()");

		it.todo("calls the onSaveSuccess / onSaveError");

	});

});

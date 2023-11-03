import React from 'react';
import { AbstractEditor } from "../abstract-editor";
import { BePaths as LibBePaths } from '../../../utils/enums/bepaths.enum';
import { FieldsFactory } from "../../fields/fields-factory";
import { TopLevelEditorPart } from "../dtd/editor-parts.dtd";
import { AbstractEditorProps, EditorAmtsConfig } from "../dtd/abstract-editor.dtd";
import { Observable } from 'rxjs';
import { RouterService } from '../../../services/router/router-service';
import { screen } from '@testing-library/dom';
import { AuthService } from '../../../services/authentication/authentication';
import { ModalComponentProps } from '@sixempress/theme';
import { RouteComponentProps } from '@sixempress/theme';

const authMoch = AuthService.isAttributePresent = jest.fn(() => false);
RouterService['reactRouter'] = { match: {} as any } as any;

declare type A = TopLevelEditorPart<any>[];
declare type B = Partial<AbstractEditorProps<any> & RouteComponentProps & ModalComponentProps & {objFromBe?: any}>;

const getEditorClass = (fields: A, beObj?: any) => {
	class EditorInstanceINT extends AbstractEditor<any> {
		controllerUrl = LibBePaths.userlist;
		generateEditorSettings() { return fields || []; }
		getEditorRelativeItem() { return new Observable(o => o.next(beObj)); }
	}
	return EditorInstanceINT;
};

const render = (fields: A, props: B = {}) => {
	const EditorObject = getEditorClass(fields, props.objFromBe);
	return tc.render(<EditorObject {...(props as any)}/>)
};

let uniqueKeyCounter = 0;
const getUniqueKey = () => (++uniqueKeyCounter).toString();

// remove visiblily field
tt.setupAuth({userAtt: [1]});
tt.setupLocations([{_id: "1", isActive: true, name: '1'}]);

describe("Abstract Editor", () => {
	
	it.todo('allows to open as edit and save withouth doing anything')
	
	/**
	 * this is more of an implementation test, but i just want to be sure we use fieldfactory fields instead of internal things
	 */
	describe("gets the correct fields from field factory getFieldToUse()", () => {


		const editor = new (getEditorClass([]))({});
		const testFn = editor['getFieldToUse'].bind(editor);

		it("Calls the FieldsFactory to get the formControlFn for the Field", () => {
			[
				{ fn: 'getCheckbox_FormControl', comp: 'Checkbox', },
				{ fn: 'getTextField_FormControl', comp: 'TextField', },
				{ fn: 'getNumberField_FormControl', comp: 'NumberField', },
				{ fn: 'getPriceField_FormControl', comp: 'PriceField', },
				{ fn: 'getTextArea_FormControl', comp: 'TextArea', },
				{ fn: 'getSelectField_FormControl', comp: 'SelectField', },
				{ fn: 'getMultiSelectField_FormControl', comp: 'MultiSelectField', },
				{ fn: 'getDateField_FormControl', comp: 'DatePicker', },
				{ fn: 'getDateField_FormControl', comp: 'DateTimePicker', },
				{ fn: 'getDateField_FormControl', comp: 'TimePicker', },
				{ fn: 'getAmtsField_FormControl', comp: 'SelectAsyncModel', },
			].forEach(n => {
				const fn = jest.spyOn(FieldsFactory, n.fn as any);
				fn.mockClear();
				testFn({component: n.comp as any, key: "a"});
				expect(fn).toHaveBeenCalledTimes(1);
				fn.mockRestore();
			});

		});

		it("is called for editor generation", () => {
			const mock = jest.spyOn(AbstractEditor.prototype, 'getFieldToUse' as any);

			const fn: typeof render = (...args) => {
				mock.mockClear();
				return render(...args);
			}
			
			fn([]);
			expect(mock).toHaveBeenCalledTimes(0);

			fn([
				{type: "formControl", logic: {key: getUniqueKey(), component: "TextField", label: "a"}},
			]);
			expect(mock).toHaveBeenCalledTimes(1);

			fn([
				{type: "formControl", logic: {key: getUniqueKey(), component: "TextField", label: "a"}},
				{type: "formControl", logic: {key: getUniqueKey(), component: "TextField", label: "a"}},
				{type: "formControl", logic: {key: getUniqueKey(), component: "TextField", label: "a"}},
				{type: "formControl", logic: {key: getUniqueKey(), component: "TextField", label: "a"}},
			]);
			expect(mock).toHaveBeenCalledTimes(4);

			fn([
				// +1
				{type: "formControl", logic: {key: getUniqueKey(), component: "TextField", label: "a"}},
				// +1
				{type: 'formGroup', logic: {key: getUniqueKey(), parts: [
					{type: 'formGroup', logic: {key: getUniqueKey(), parts: [
						{type: "formControl", logic: {key: getUniqueKey(), component: "TextField", label: "a"}},
					]}},
				]}},
				// +2
				{type: "formArray",   logic: {key: getUniqueKey(), min: 1, parts: [
					{type: "formArray", logic: {key: getUniqueKey(), min: 1, parts: [
						{type: 'formGroup', logic: {key: getUniqueKey(), parts: [
							{type: "formControl", logic: {key: getUniqueKey(), component: "TextField", label: "a"}},
						]}},
					]}},
					{type: 'formGroup', logic: {key: getUniqueKey(), parts: [
						{type: "formControl", logic: {key: getUniqueKey(), component: "TextField", label: "a"}},
					]}},
				]}},
			]);
			expect(mock).toHaveBeenCalledTimes(4);

			mock.mockRestore();
		});

	});

	it("handle empty", () => {
		render([]);
		expect(screen.getByRole("form").children).toHaveLength(0);
	});

	it("wraps into container or not", () => {
		// default container
		render([]);
		expect(screen.getByRole("form").parentElement.className).not.toBe("")

		// no container manual sett
		render([], {extendWrapper: true});
		expect(screen.getByRole("form").parentElement.className).toBe("")
		
		// no container in modal
		render([], {modalRef: {} as any});
		expect(screen.getByRole("form").parentElement.className).toBe("")
	});

	describe("parts generation", () => {

		it("generates different saveActionArea if config passed", () => {
			render([{type: "divider"}]);
			expect(screen.queryByTestId('secretText')).toBeNull();
			expect(screen.getAllByRole('button')).toHaveLength(2); // the save button and cancel
			
			const jsxArea = (<h1 data-testid='secretText'>secretText</h1>);
			render([{type: "divider"}], {saveActionArea: () => jsxArea});
			expect(screen.queryByTestId('secretText')).not.toBeNull();
			// no buttons as we overide the jsxArea
			expect(screen.queryAllByRole('button')).toHaveLength(0);

		});

		it("generates all parts, and passes gridprops to the grid item", () => {
			const pName = 'data-testid';
			const pValue = "__secret_value";
			const props: any = {[pName]: pValue};

			render([
				// +1
				{type: "divider", gridProp: props},
				// +1
				{type: "jsx", gridProp: props, component: () => <table></table>},
				// the inputlabelprops are to identify later the jsx obj
				// +1
				{type: "formControl", gridProp: props, logic: {key: getUniqueKey(), component: "TextField", props: {InputLabelProps: {['data-testid']: 'fc'} as any}, label: "a"}},
				// formGroup dont have the graphic jsx as it's not wrapped, so here only the formControl has the attributes
				// so only the end formControl is generated
				// +1
				{type: 'formGroup', gridProp: props, logic: {key: getUniqueKey(), parts: [
					{type: 'formGroup', gridProp: props, logic: {key: getUniqueKey(), parts: [
						{type: "formControl", gridProp: props, logic: {key: getUniqueKey(), component: "TextField",  props: {InputLabelProps: {['data-testid']: 'fg-fg-fc'} as any}, label: "a"}},
					]}},
				]}},
				// as this is wrapped, it creates a grid and the props are passed
				// so the top level fromGroup, and the formControl have the props 
				// +2
				{type: 'formGroup', gridProp: props, wrapRender: (r) => r, logic: {key: getUniqueKey(), parts: [
					{type: 'formGroup', gridProp: props, logic: {key: getUniqueKey(), parts: [
						{type: "formControl", gridProp: props, logic: {key: getUniqueKey(), component: "TextField",  props: {InputLabelProps: {['data-testid']: 'fg.2-fg-fc'} as any}, label: "a"}},
					]}},
				]}},
				// all three have jsx
				// +3
				{type: 'formGroup', gridProp: props, wrapRender: (r) => r, logic: {key: getUniqueKey(), parts: [
					{type: 'formGroup', gridProp: props, wrapRender: (r) => r, logic: {key: getUniqueKey(), parts: [
						{type: "formControl", gridProp: props, logic: {key: getUniqueKey(), component: "TextField", props: {InputLabelProps: {['data-testid']: 'fg.3-fg-fc'} as any}, label: "a"}},
					]}},
				]}},
				// form array has length 0, so no item is generated
				// but the entire thing is wrapped anyways in a container so
				// +1
				{type: "formArray",   gridProp: props, logic: {key: getUniqueKey(), parts: [
					{type: "formArray", gridProp: props, logic: {key: getUniqueKey(), parts: [
						{type: 'formGroup', gridProp: props, logic: {key: getUniqueKey(), parts: [
							{type: "formControl", gridProp: props, logic: {key: getUniqueKey(), component: "TextField", props: {InputLabelProps: {['data-testid']: 'fa-fa-fg-fc'} as any}, label: "a"}},
						]}},
					]}},
					{type: 'formGroup', gridProp: props, logic: {key: getUniqueKey(), parts: [
						{type: "formControl", gridProp: props, logic: {key: getUniqueKey(), component: "TextField", props: {InputLabelProps: {['data-testid']: 'fa-fg-fc'} as any}, label: "a"}},
					]}},
				]}},

				// as min 1 all the fields are generated once
				// and the entire thing is still wrapped
				// but the second formArray still have min: 0
				// but it is still wrapped
				// +3
				{type: "formArray",   gridProp: props, logic: {key: getUniqueKey(), min: 1, parts: [
					{type: "formArray", gridProp: props, logic: {key: getUniqueKey(), parts: [
						{type: 'formGroup', gridProp: props, logic: {key: getUniqueKey(), parts: [
							{type: "formControl", gridProp: props, logic: {key: getUniqueKey(), component: "TextField", props: {InputLabelProps: {['data-testid']: 'fa2-fa-fg-fc'} as any}, label: "a"}},
						]}},
					]}},
					{type: 'formGroup', gridProp: props, logic: {key: getUniqueKey(), parts: [
						{type: "formControl", gridProp: props, logic: {key: getUniqueKey(), component: "TextField", props: {InputLabelProps: {['data-testid']: 'fa2-fg-fc'} as any}, label: "a"}},
					]}},
				]}},

				// every part is min: 1, so everything is genereated
				// +4
				{type: "formArray",   gridProp: props, logic: {key: getUniqueKey(), min: 1, parts: [
					{type: "formArray", gridProp: props, logic: {key: getUniqueKey(), min: 1, parts: [
						{type: 'formGroup', gridProp: props, logic: {key: getUniqueKey(), parts: [
							{type: "formControl", gridProp: props, logic: {key: getUniqueKey(), component: "TextField", props: {InputLabelProps: {['data-testid']: 'fa3-fa-fg-fc'} as any}, label: "a"}},
						]}},
					]}},
					{type: 'formGroup', gridProp: props, logic: {key: getUniqueKey(), parts: [
						{type: "formControl", gridProp: props, logic: {key: getUniqueKey(), component: "TextField", props: {InputLabelProps: {['data-testid']: 'fa3-fg-fc'} as any}, label: "a"}},
					]}},
				]}},

				// +11
				{type: "formArray", gridProp: props, wrapRender: (r) => r, logic: {key: getUniqueKey(), min: 2, parts: [
					{type: "formArray", gridProp: props, wrapRender: (r) => r, logic: {key: getUniqueKey(), min: 2, parts: [
						{type: 'formGroup', gridProp: props, wrapRender: (r) => r, logic: {key: getUniqueKey(), parts: [
							{type: "formControl", gridProp: props, wrapRender: (r) => r, logic: {key: getUniqueKey(), component: "TextField", props: {InputLabelProps: {['data-testid']: 'fa4-fg-fc'} as any}, label: "a"}},
						]}},
					]}},
				]}},
			]);

			const grids = screen.queryAllByTestId(pValue);
			expect(grids).toHaveLength(28);
			
			// expect(grids.find(Divider)).toHaveLength(1);
			expect(screen.queryAllByRole('table')).toHaveLength(1);
			expect(screen.queryAllByTestId('fc')).toHaveLength(1);
			expect(screen.queryAllByTestId('fg-fg-fc')).toHaveLength(1);
			expect(screen.queryAllByTestId('fg.2-fg-fc')).toHaveLength(1);
			expect(screen.queryAllByTestId('fg.3-fg-fc')).toHaveLength(1);
			
			expect(screen.queryAllByTestId('fa-fa-fg-fc')).toHaveLength(0);
			expect(screen.queryAllByTestId('fa-fg-fc')).toHaveLength(0);
			
			expect(screen.queryAllByTestId('fa2-fa-fg-fc')).toHaveLength(0);
			expect(screen.queryAllByTestId('fa2-fg-fc')).toHaveLength(1);

			expect(screen.queryAllByTestId('fa3-fa-fg-fc')).toHaveLength(1);
			expect(screen.queryAllByTestId('fa3-fg-fc')).toHaveLength(1);

			expect(screen.queryAllByTestId('fa4-fg-fc')).toHaveLength(4);
		});
		
		it("separates paper containers if cut is present", () => {
			render([
				{type: "divider"}, 
				{type: "jsx", component: () => <table></table>},
				// required: true is used only to disable the save button
				{type: "formControl", logic: {key: getUniqueKey(), component: "TextField", required: true, props: {InputLabelProps: {['data-testid']: 'fc'} as any}, label: "a"}},
				{type: 'formGroup', logic: {key: getUniqueKey(), parts: [
					{type: 'formGroup', logic: {key: getUniqueKey(), parts: [
						{type: "formControl", logic: {key: getUniqueKey(), component: "TextField", props: {InputLabelProps: {['data-testid']: 'fg-fg-fc'} as any}, label: "a"}},
					]}},
				]}},
				{type: "formArray",   logic: {key: getUniqueKey(), min: 1, parts: [
					{type: "formArray", logic: {key: getUniqueKey(), min: 1, parts: [
						{type: 'formGroup', logic: {key: getUniqueKey(), parts: [
							{type: "formControl", logic: {key: getUniqueKey(), component: "TextField", props: {InputLabelProps: {['data-testid']: 'fa3-fa-fg-fc'} as any}, label: "a"}},
						]}},
					]}},
					{type: 'formGroup', logic: {key: getUniqueKey(), parts: [
						{type: "formControl", logic: {key: getUniqueKey(), component: "TextField", props: {InputLabelProps: {['data-testid']: 'fa3-fg-fc'} as any}, label: "a"}},
					]}},
				]}},
			]);

			// ensure there is the save btn
			expect(screen.getByRole('form').children).toHaveLength(1);

			render([
				{type: "divider"},
				// +1
				{type: 'cut'},
				{type: "jsx", component: () => <table></table>},
				// +1
				{type: 'cut'},
				// required: true is used only to disable the save button
				{type: "formControl", logic: {key: getUniqueKey(), component: "TextField", required: true, props: {InputLabelProps: {['data-testid']: 'fc'} as any}, label: "a"}},
				{type: 'formGroup', logic: {key: getUniqueKey(), parts: [
					{type: 'formGroup', logic: {key: getUniqueKey(), parts: [
						{type: "formControl", logic: {key: getUniqueKey(), component: "TextField", props: {InputLabelProps: {['data-testid']: 'fg-fg-fc'} as any}, label: "a"}},
					]}},
				]}},
				// +1
				{type: 'cut'},
				{type: "formArray",   logic: {key: getUniqueKey(), min: 1, parts: [
					{type: "formArray", logic: {key: getUniqueKey(), min: 1, parts: [
						{type: 'formGroup', logic: {key: getUniqueKey(), parts: [
							{type: "formControl", logic: {key: getUniqueKey(), component: "TextField", props: {InputLabelProps: {['data-testid']: 'fa3-fa-fg-fc'} as any}, label: "a"}},
						]}},
					]}},
					{type: 'formGroup', logic: {key: getUniqueKey(), parts: [
						{type: "formControl", logic: {key: getUniqueKey(), component: "TextField", props: {InputLabelProps: {['data-testid']: 'fa3-fg-fc'} as any}, label: "a"}},
					]}},
				]}},
				// +1
				{type: 'cut'},
			]);

			expect(screen.getByRole('form').children).toHaveLength(5);
		});

		it("wraps the parts in wrapRender() if given", () => {

			const Wrapper = (p) => <div data-testid="test-wrapper-render">{p.children}</div>;

			render([
				// +1
				{type: "formControl", wrapRender: (r) => <Wrapper>{r}</Wrapper>, logic: {key: getUniqueKey(), component: "TextField", label: "label-render-in-wrapper"}},

				// +3
				{type: 'formGroup', wrapRender: (r) => <Wrapper>{r}</Wrapper>, logic: {key: getUniqueKey(), parts: [
					{type: 'formGroup', wrapRender: (r) => <Wrapper>{r}</Wrapper>, logic: {key: getUniqueKey(), parts: [
						{type: "formControl", wrapRender: (r) => <Wrapper>{r}</Wrapper>, logic: {key: getUniqueKey(), component: "TextField", label: "label-render-in-wrapper"}},
					]}},
				]}},
				
				// +6
				{type: "formArray", wrapRender: (r) => <Wrapper>{r}</Wrapper>, logic: {key: getUniqueKey(), min: 1, parts: [
					{type: "formArray", wrapRender: (r) => <Wrapper>{r}</Wrapper>, logic: {key: getUniqueKey(), min: 1, parts: [
						{type: 'formGroup', wrapRender: (r) => <Wrapper>{r}</Wrapper>, logic: {key: getUniqueKey(), parts: [
							{type: "formControl", wrapRender: (r) => <Wrapper>{r}</Wrapper>, logic: {key: getUniqueKey(), component: "TextField", label: "label-render-in-wrapper"}},
						]}},
					]}},
					{type: 'formGroup', wrapRender: (r) => <Wrapper>{r}</Wrapper>, logic: {key: getUniqueKey(), parts: [
						{type: "formControl", wrapRender: (r) => <Wrapper>{r}</Wrapper>, logic: {key: getUniqueKey(), component: "TextField", label: "label-render-in-wrapper"}},
					]}},
				]}},
			]);

			
			expect(screen.getAllByTestId("test-wrapper-render")).toHaveLength(10);
			expect(screen.getAllByText("label-render-in-wrapper", {selector: "label"})).toHaveLength(4);
		});

		describe("form array", () => {

			const getAddBtn = () => {
				return screen.queryAllByRole("button")
					.filter(c => c.innerHTML.includes("+"))
					.map(tc.wrap);
			};
			const getRemoveBtn = () => {
				return screen.queryAllByRole('button')
					.filter(c => c.firstChild.firstChild.firstChild && tc.wrap(c.firstChild.firstChild.firstChild).getReactInstance().fiber.type.render.name.toLowerCase() === 'svgicon')
					.map(tc.wrap);
			};

			it("add/delete row btn works for ui and logic", () => {
				render([
					{type: 'formArray', logic: {key: "a", max: 2, parts: [
						{type: "formControl", logic: {key: 'b', component: "TextField", label: "ad_arr_test_labe"}},
					]}}
				]);

				// as min is zero, no field is generaetd
				expect(screen.queryAllByText("ad_arr_test_labe", {selector: 'label'})).toHaveLength(0);
				expect(getRemoveBtn()).toHaveLength(0);

				// add 1 (the btn is visible)
				getAddBtn()[0].click();
				expect(screen.queryAllByText("ad_arr_test_labe", {selector: 'label'})).toHaveLength(1);
				expect(getRemoveBtn()).toHaveLength(1);

				// add another
				getAddBtn()[0].click();
				expect(screen.queryAllByText("ad_arr_test_labe", {selector: 'label'})).toHaveLength(2);
				expect(getRemoveBtn()).toHaveLength(2);

				// as now there are 2 fields, the max has been reached, so the add btn is not present
				expect(getAddBtn()).toHaveLength(0);
				expect(getRemoveBtn()).toHaveLength(2);
				// expect(e.instance().state.formGroup.value.a).toHaveLength(2);

				getRemoveBtn()[0].click();
				expect(getAddBtn()).toHaveLength(1);
				expect(getRemoveBtn()).toHaveLength(1);
				
				getRemoveBtn()[0].click();
				expect(getAddBtn()).toHaveLength(1);
				expect(getRemoveBtn()).toHaveLength(0);

				getAddBtn()[0].click();
				expect(getAddBtn()).toHaveLength(1);
				expect(getRemoveBtn()).toHaveLength(1);
			});

			it("custom logic for delete row btn", () => {
				render([
					{type: 'formArray', logic: {key: "a", min: 2, canDeleteChild: (v) => !v._id, parts: [
						{type: "formControl",  logic: {key: '_id', component: "TextField", label: "ID"}},
						{type: "formControl",  logic: {key: 'a', component: "TextField", props: {InputLabelProps: {['data-testid']: '__key_to_count_field__'} as any}, label: "a"}},
					]}}
				], {objFromBe: {a: [{_id: "1"}]}});

				const countRows = () => screen.queryAllByTestId("__key_to_count_field__").length;


				// expect the same as min
				expect(countRows()).toBe(2);
				// epxect no button as it has min items
				expect(getRemoveBtn()).toHaveLength(0);
				
				getAddBtn()[0].click();
				expect(countRows()).toBe(3);
				// expect 1 btn not present because of the rule canDeleteChild given
				// but as the min is not reached the other rows can be deleted
				expect(getRemoveBtn()).toHaveLength(2);

				getAddBtn()[0].click();
				expect(countRows()).toBe(4);
				expect(getRemoveBtn()).toHaveLength(3);

				// go back to min

				getRemoveBtn()[0].click();
				expect(countRows()).toBe(3);
				expect(getRemoveBtn()).toHaveLength(2);

				getRemoveBtn()[0].click();
				expect(countRows()).toBe(2);
				expect(getRemoveBtn()).toHaveLength(0);

			});

			it("uses given addBtn logic for formArray add row btn", () => {
				render([
					{type: 'formArray', logic: {key: "a", addBtn: false, parts: [
						{type: "formControl",  logic: {key: 'a', component: "TextField", label: "a"}},
					]}}
				]);
				expect(getAddBtn()).toHaveLength(0);

				render([
					{type: 'formArray', logic: {key: "a", addBtn: "+ YEE__IMPOSSIBLE__AddBtnTest__TEXT", parts: [
						{type: "formControl",  logic: {key: 'a', component: "TextField", label: "a"}},
					]}}
				]);
				expect(getAddBtn()).toHaveLength(1);
				expect(getAddBtn()[0].element.textContent).toBe("+ YEE__IMPOSSIBLE__AddBtnTest__TEXT");

				render([
					{type: 'formArray', logic: {key: "a", addBtn: () => <h1>Oh Yeah</h1>, parts: [
						{type: "formControl",  logic: {key: 'a', component: "TextField", label: "a"}},
					]}}
				]);
				expect(getAddBtn()).toHaveLength(0);
				screen.getByText("Oh Yeah");
			});

			it("the amts fields update the right row value", () => {
				render([]);

				const getInstance: any = () => tc.wrap(screen.getByRole('form')).getReactInstance(4).getReactComponent();

				const asyncUserConf: EditorAmtsConfig<any> = {
					renderValue: (c) => c && c.name,
					modelClass: "User" as any,
					amtsInput: { bePath: LibBePaths.userlist, infoConf: { columns: [{title: 'Username', data: 'username'}]}, }
				};
				render([
					{type: 'formArray', logic: { key: 'a', min: 3, parts: [
						{type: 'formControl', logic: { component: 'SelectAsyncModel', key: 'a', label: 'amts_field_label', props: asyncUserConf }},
					]}},
				]);

				expect(getInstance().state.formGroup.value.a).toEqual([
					undefined, 
					undefined, 
					undefined
				]);

				tc.getAllMuiField("amts_field_label")[1].choseAmts({name: "second_text_field_value"});
				(screen.getAllByRole('textbox') as any[]).forEach((t, idx) => {
					if (idx === 1) {
						expect(t.value).toBe("second_text_field_value");
					} else {
						expect(t.value).toBeFalsy();
					}
				});
				expect(getInstance().state.formGroup.value.a).toEqual([
					undefined, 
					expect.objectContaining({fetched: {name: "second_text_field_value"}}), 
					undefined
				]);

				tc.getAllMuiField("amts_field_label")[2].choseAmts({name: "third"});
				(screen.getAllByRole('textbox') as any[]).forEach((t, idx) => {
					if (idx === 1) {
						expect(t.value).toBe("second_text_field_value");
					} else if (idx === 2) {
						expect(t.value).toBe("third");
					}else {
						expect(t.value).toBeFalsy();
					}
				});
				expect(getInstance().state.formGroup.value.a).toEqual([
					undefined,
					expect.objectContaining({fetched: {name: "second_text_field_value"}}), 
					expect.objectContaining({fetched: {name: "third"}})
				]);

				tc.getAllMuiField("amts_field_label")[0].choseAmts({name: "f"});
				(screen.getAllByRole('textbox') as any[]).forEach((t, idx) => {
					if (idx === 0) {
						expect(t.value).toBe("f");
					} else if (idx === 1) {
						expect(t.value).toBe("second_text_field_value");
					} else if (idx === 2) {
						expect(t.value).toBe("third");
					}else {
						expect(t.value).toBeFalsy();
					}
				});
				expect(getInstance().state.formGroup.value.a).toEqual([
					expect.objectContaining({fetched: {name: "f"}}), 
					expect.objectContaining({fetched: {name: "second_text_field_value"}}), 
					expect.objectContaining({fetched: {name: "third"}})
				]);

			});

		});
		
	});

});

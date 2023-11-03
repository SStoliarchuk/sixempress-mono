import React from 'react';
import { FieldsFactory } from "../fields-factory";
import { AmtsFieldProps } from "../dtd";
import { FormControl } from "react-reactive-form";
import { act, cleanup, render, screen } from '@testing-library/react';
import { DateFieldProps } from '../date.field';

jest.mock("../../async-model-table-select/async-model-table-select", () => ({
	AsyncModelTableSelect: () => "Mocked AsyncModelTableSelect",
}))

/**
 * Never use this, but it exists
 */
let testContainerClass: React.Component;
const setInstance = () => {

	class FieldsTestContainer extends React.Component<any, any> {
		constructor(p) { super(p); testContainerClass = this; }
		state: any = {};
		render() { return (
			<>
				<FieldsFactory.TextArea 				label="TextArea" 						value={this.state.TextArea || ""} 				onChange={(e) => this.setState({TextArea: e.target.value})} />
				<FieldsFactory.TextField 				label="TextField" 					value={this.state.TextField || ""} 				onChange={(e) => this.setState({TextField: e.target.value})} />
				<FieldsFactory.PriceField 			label="PriceField" 					value={this.state.PriceField || ""} 			onChange={(e) => this.setState({PriceField: e.target.value})} />
				<FieldsFactory.NumberField			label="NumberField" 				value={this.state.NumberField || ""} 			onChange={(e) => this.setState({NumberField: e.target.value})} />

				{/* it is mocked, so no need for amtsinput */}
				<FieldsFactory.AmtsField textFieldProps={{label: "AmtsField"}} renderValue={(v) => v[Object.keys(v)[0]].toString()} amtsInput={{} as any}/>
				
				<FieldsFactory.DateField 				label="DateField" 					value={this.state.DateField}			 				onChange={(m) => this.setState({DateField: m && m.toDate()})} />
				
				<FieldsFactory.Checkbox 				label="Checkbox" 						checked={Boolean(this.state.Checkbox)} 		onChange={(e) => this.setState({Checkbox: e.target.checked})} />
				<FieldsFactory.Radio 						label="Radio" 							checked={Boolean(this.state.Radio)} 			onChange={(e) => this.setState({Radio: e.target.checked})} />
				<FieldsFactory.Switch 					label="Switch" 							checked={Boolean(this.state.Switch)} 			onChange={(e) => this.setState({Switch: e.target.checked})} />

				<FieldsFactory.SelectField 			label="SelectField" 				value={this.state.SelectField || "1"} 			onChange={(e) => this.setState({SelectField: e.target.value})} 
					values={[{value: "1", label: "1"}, {value: "2", label: "2", menuLabel: (<h1>label_option2</h1>)}, {value: "3", label: "3"}, {value: "4", label: "4"}]}
				/>
				
				<FieldsFactory.MultiSelectField label="MultiSelectField" 		value={this.state.MultiSelectField || []} onChange={(e) => this.setState({MultiSelectField: e.target.value})} 
					values={[{value: "1", label: "1"}, {value: "2", label: "2", menuLabel: (<h1>label_option2</h1>)}, {value: "3", label: "3"}, {value: "4", label: "4"}]}
				/>
			</>
		); }
	}

	tc.render(<FieldsTestContainer/>)
};


describe("Fields Factory", () => {

	beforeEach(() => {
		setInstance();
	});

	it("passes the props to the lower most ocomponent", () => {
		const fn = (Item: any, extraArgs?: any) => {
			cleanup();
			render(<Item data-testid="passes_props_testid_fieldsFactory_jest" {...(extraArgs || {})}/>);
			screen.getByTestId('passes_props_testid_fieldsFactory_jest');
		}
		// amts is special <3
		fn(FieldsFactory.AmtsField, {textFieldProps: {"data-testid": "passes_props_testid_fieldsFactory_jest"}});
		
		fn(FieldsFactory.TextField);
		fn(FieldsFactory.TextArea);
		fn(FieldsFactory.NumberField);
		fn(FieldsFactory.PriceField);
		fn(FieldsFactory.Checkbox);
		fn(FieldsFactory.Radio);
		fn(FieldsFactory.Switch);
		fn(FieldsFactory.DateField);
		
		fn(FieldsFactory.SelectField, {values: [{value: ""}], value: ""});
		fn(FieldsFactory.MultiSelectField, {values: [{value: ""}], value: ""});
	});

	describe("TextField", () => {
		
		it("change the value", () => {
			tc.getMuiField("TextField").type( 'test');
			expect(tc.getMuiField('TextField').element).toHaveValue('test')

			tc.getMuiField("TextField").type( '123');
			expect(tc.getMuiField('TextField').element).toHaveValue('test123')
		});

	});

	describe("TextArea", () => {

		it("is a textarea (for accessibility)", () => {
			expect(tc.getMuiField('TextArea').element.tagName.toLowerCase()).toBe("textarea")
		});

		it("change the value", () => {
			tc.getMuiField("TextArea").type( 'test');
			expect(tc.getMuiField('TextArea').element).toHaveValue('test')
			tc.getMuiField("TextArea").type( '123');
			expect(tc.getMuiField('TextArea').element).toHaveValue('test123')
		});

	});

	describe("Number", () => {

		it("triggers the change fns", () => {
			const changeMock = jest.fn();

			render(<FieldsFactory.PriceField label="Hello" onChange={changeMock}/>);
			tc.getMuiField("Hello").type( 'test');
			expect(changeMock).toHaveBeenCalled();
		});
		
		it("has type='number' (for accesssibility?)", () => {
			expect((tc.getMuiField('NumberField').element as any).type).toBe("number")
		});

		it("allows to write numbers only", () => {
			expect(tc.getMuiField('NumberField').element).toHaveValue(null)
			tc.getMuiField("NumberField").type( 'test');
			expect(tc.getMuiField('NumberField').element).toHaveValue(null)

			tc.getMuiField("NumberField").type( '123');
			// is it the tesing library or jest that parses to int? 
			expect(tc.getMuiField('NumberField').element).toHaveValue(123);
			
			tc.getMuiField("NumberField").type( 'asd25', {clear: true});
			expect(tc.getMuiField('NumberField').element).toHaveValue(25);
		});

	});

	describe("Price", () => {

		it("triggers the change/blur fns", () => {
			const changeMock = jest.fn();
			const blurMock = jest.fn();

			render(<FieldsFactory.PriceField label="Hello" onChange={changeMock} onBlur={blurMock}/>);
			tc.getMuiField("Hello").type( 'test');
			expect(changeMock).toHaveBeenCalled();
			expect(blurMock).toHaveBeenCalled();
		});

		it("formats to readble price", () => {
			const fn = (input: number | string, output: string) => {
				tc.getMuiField("PriceField").type( input, {clear: true});
				expect(tc.getMuiField('PriceField').element).toHaveValue(output)	
			}
	
			fn(123, '123.00');
			fn(123.2, '123.20');
			fn("5", '5.00');
			fn(".1", '0.10');
			fn(".55", '0.55');
			fn("9999.55", '9999.55');
		});

	});

	describe("Checkbox / Switch / Radio", () => {
		
		it('toggles checked on click', () => {
			expect(tc.getMuiField("Checkbox").element).not.toBeChecked();
			tc.getMuiField("Checkbox").click();
			expect(tc.getMuiField("Checkbox").element).toBeChecked();
			tc.getMuiField("Checkbox").click();
			expect(tc.getMuiField("Checkbox").element).not.toBeChecked();


			expect(tc.getMuiField("Switch").element).not.toBeChecked();
			tc.getMuiField("Switch").click();
			expect(tc.getMuiField("Switch").element).toBeChecked();
			tc.getMuiField("Switch").click();
			expect(tc.getMuiField("Switch").element).not.toBeChecked();


			expect(tc.getMuiField("Radio").element).not.toBeChecked();
			tc.getMuiField("Radio").click();
			expect(tc.getMuiField("Radio").element).toBeChecked();
			// its a radio you cant uncheck
			tc.getMuiField("Radio").click();
			expect(tc.getMuiField("Radio").element).toBeChecked();
		});

	});

	describe("Select", () => {
		
		it("changes the value", async () => {
			expect(tc.getMuiField("SelectField").element).toHaveValue("1");
			tc.getMuiField("SelectField").muiSelect("3");
			expect(tc.getMuiField("SelectField").element).toHaveValue("3");
		});

		it("uses the menuLabel if available", () => {
			expect(screen.queryByText("label_option2")).toBeNull();
			tc.getMuiField("SelectField").muiSelect(1);
			// 1 in the menu, the select value contains the normal label
			expect(screen.queryAllByText("label_option2")).toHaveLength(1);
		});

	});

	describe("MultiSelect", () => {

		it("adds/removes the values", () => {
			expect(tc.getMuiField("MultiSelectField").element).toHaveValue('')

			tc.getMuiField("MultiSelectField").muiSelectMulti(["1"])
			expect(tc.getMuiField("MultiSelectField").element).toHaveValue('1')

			tc.getMuiField("MultiSelectField").muiSelectMulti(["3"])
			expect(tc.getMuiField("MultiSelectField").element).toHaveValue('1,3')

			tc.getMuiField("MultiSelectField").muiSelectMulti(["1"])
			expect(tc.getMuiField("MultiSelectField").element).toHaveValue('3')
		});

		it("doesnt use menuLabel, but label for value field", () => {
			expect(tc.getMuiField("MultiSelectField").element).toHaveValue('')

			tc.getMuiField("MultiSelectField").muiSelectMulti(["1"])
			expect(tc.getMuiField("MultiSelectField").element).toHaveValue('1')

			expect(screen.queryAllByText('label_option2')).toHaveLength(1);
			tc.getMuiField("MultiSelectField").muiSelectMulti(["label_option2"])
			expect(tc.getMuiField("MultiSelectField").element).toHaveValue('1,2')
			expect(screen.queryAllByText('label_option2')).toHaveLength(1);
		});
		
	});

	describe("DateField", () => {

		it("uses the appropriate component from @material-ui/pickers", () => {
			const fn = (typeProp: DateFieldProps['pickerType'], expectComp: string) => {
				cleanup();
				const comp = render(<FieldsFactory.DateField onChange={() => {}} pickerType={typeProp}/>);
				comp.getByText(expectComp);
			}

			fn("date", "KeyboardDatePicker");
			fn("simple_date", "DatePicker");
			fn("time", "KeyboardTimePicker");
			fn("simple_time", "TimePicker");
			fn("datetime", "KeyboardDateTimePicker");
			fn("simple_datetime", "DateTimePicker");
		});

	});
	
	describe("AmtsField", () => {
		
		it.todo("finish");

	});

});

// here we check the basic logic that should work for all asbtractControl functions
describe("Fields Factory abstractControl functions", () => {
	// TODO add a check for the presence of {...control.handler()}
	
	it("Date/Time", () => {
		const fn = jest.spyOn(FieldsFactory, 'DateField');
		
		const minProps = (): DateFieldProps => ({ onChange: () => {}, value: new Date() });
		
		fn.mockClear();
		let props = {...minProps()};
		let formFn = FieldsFactory.getDateField_FormControl(props);
		let el = render(formFn(new FormControl(null)));
		expect(fn).toHaveBeenCalledTimes(1);
		// we delete onChange as it is replaced when passed down
		// it is wrapped in the formControl onchange function
		delete props.onChange;
		expect(fn).toHaveBeenLastCalledWith(expect.objectContaining(props), expect.anything());

		
		// ensure props are passed down
		fn.mockClear();
		props = {...minProps(), pickerType: "time"};
		formFn = FieldsFactory.getDateField_FormControl(props);
		el = render(formFn(new FormControl(null)));
		
		expect(fn).toHaveBeenCalledTimes(1);
		delete props.onChange;
		expect(fn).toHaveBeenLastCalledWith(expect.objectContaining(props), expect.anything());


		// ensure that onChange is called
		fn.mockClear();
		const onChangeFn = jest.fn();
		props = {...minProps(), onChange: onChangeFn};
		formFn = FieldsFactory.getDateField_FormControl(props);
		el = render(formFn(new FormControl(null)));
		
		// expect(onChangeFn).toHaveBeenCalledTimes(0);
		// tc.wrap(el.getByRole('textbox')).type( "{backspace}");
		// expect(onChangeFn).toHaveBeenCalledTimes(1);

		fn.mockRestore();
	});

	it("Amts", () => {
		const fn = jest.spyOn(FieldsFactory, 'AmtsField');
		const minProps = (): AmtsFieldProps<any> => ({amtsInput: {bePath: "" as any, choseFn: () => {}, infoConf: {columns: [{data: "_id", title: "id"}]}}, renderValue: (s) => s, textFieldProps: {}});
		
		fn.mockClear();
		const props = {...minProps(), ['__hiden_thinghy']: 1};
		// spy the function onOpen to get the abstract control
		const openFn = jest.fn();
		props.onOpen = openFn;
		const control = new FormControl(null);
		const formFn = FieldsFactory.getAmtsField_FormControl(props);
		const el = render(formFn(control));

		// expect(el.find(FieldsFactory.AmtsField)).toHaveLength(1);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenLastCalledWith(expect.objectContaining({['__hiden_thinghy']: 1}), expect.anything());

		// expect the control onOpen function
		expect(openFn).toHaveBeenCalledTimes(0);
		act(() => { tc.wrap(el.getByRole('textbox')).click() });
		expect(openFn).toHaveBeenCalledTimes(1);
		expect(openFn).toHaveBeenLastCalledWith(expect.anything(), control);

		fn.mockRestore();
	});

	describe("Checkbox", () => {
			
		it("passes the props to the getcheckbox function", () => {
			const fn = jest.spyOn(FieldsFactory, 'Checkbox');
			fn.mockClear();

			const control = new FormControl(false);
			const props = {color: 'secondary', ['hidden_prop_jsx' as any]: 1};
			const lableProps = {color: 'secondary', ['hidden_prop_jsx_for_label' as any]: 4};

			const formFn = FieldsFactory.getCheckbox_FormControl(props as any, lableProps as any);
			render(formFn(control))

			// ensure it calls the fn
			expect(fn).toHaveBeenCalledTimes(1);
			expect(fn).toHaveBeenLastCalledWith( expect.objectContaining({...props, formControlProps: expect.objectContaining(lableProps)}), expect.anything() );

			fn.mockRestore();
		});

		it("tranforms the control.value into checked prop", () => {
			const formFn = FieldsFactory.getCheckbox_FormControl({label: '1'});
			
			cleanup();
			let el = render(formFn(new FormControl(false)));
			expect(el.getByRole('checkbox')).toHaveProperty('checked', false);

			cleanup();
			el = render(formFn(new FormControl(true)));
			expect(el.getByRole('checkbox')).toHaveProperty('checked', true);

		});

	});

	it("TextField", () => {
		const fn = jest.spyOn(FieldsFactory, 'TextField');
		fn.mockClear();
		
		const props = {label: 'labelaaa'};
		const formFn = FieldsFactory.getTextField_FormControl(props);
		render(formFn(new FormControl(false)));

		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(expect.objectContaining(props), expect.anything());

		fn.mockRestore();
	});
	
	it("TextArea", () => {
		const fn = jest.spyOn(FieldsFactory, 'TextArea');
		fn.mockClear();
		
		const props = {label: 'labelaaa'};
		const formFn = FieldsFactory.getTextArea_FormControl(props);
		render(formFn(new FormControl(false)));

		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(expect.objectContaining(props), expect.anything());

		fn.mockRestore();
	});

	it("Number", () => {
		const fn = jest.spyOn(FieldsFactory, 'NumberField');
		fn.mockClear();
		
		const props = {label: 'labelaaa'};
		const formFn = FieldsFactory.getNumberField_FormControl(props);
		render(formFn(new FormControl(false)));

		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(expect.objectContaining(props), expect.anything());

		fn.mockRestore();
	});

	it("Price", () => {
		const fn = jest.spyOn(FieldsFactory, 'PriceField');
		fn.mockClear();
		
		const props = {label: 'labelaaa'};
		const formFn = FieldsFactory.getPriceField_FormControl(props);
		render(formFn(new FormControl(false)));

		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(expect.objectContaining(props), expect.anything());

		fn.mockRestore();
	});

	it("Select", () => {
		const fn = jest.spyOn(FieldsFactory, 'SelectField');
		fn.mockClear();
		
		const props = {label: 'labelaaa', value: "", values: []};
		const formFn = FieldsFactory.getSelectField_FormControl([], props);
		render(formFn(new FormControl(false)));

		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(expect.objectContaining({...props}), expect.anything());

		fn.mockRestore();
	});

	it("MultiSelect", () => {
		const fn = jest.spyOn(FieldsFactory, 'MultiSelectField');
		fn.mockClear();
		
		const props = {label: 'labelaaa', value: "", values: []};
		const formFn = FieldsFactory.getMultiSelectField_FormControl([], props);
		render(formFn(new FormControl(false)));

		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(expect.objectContaining({...props, values: []}), expect.anything());

		fn.mockRestore();
	});

});

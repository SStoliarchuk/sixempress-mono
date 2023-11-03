import { MuiPickersUtilsProvider as _MuiPickersUtilsProvider } from '@material-ui/pickers';
import React from 'react';

const fixDomProps = (p) => {
	const n = {};
	for (const k in p) {
		if (k.indexOf("on") === 0) {
			n[k] = p[k]
		} else {
			n[k.toLowerCase()] = p[k]
		}
	}

	delete n['showtodaybutton'];
	delete n['ampm'];
	delete n['error'];
	
	return n;
}

export const KeyboardDatePicker = (p) => <div {...fixDomProps(p)}>KeyboardDatePicker</div>;
export const DatePicker = (p) => <div {...fixDomProps(p)}>DatePicker</div>;
export const KeyboardTimePicker = (p) => <div {...fixDomProps(p)}>KeyboardTimePicker</div>;
export const TimePicker = (p) => <div {...fixDomProps(p)}>TimePicker</div>;
export const KeyboardDateTimePicker = (p) => <div {...fixDomProps(p)}>KeyboardDateTimePicker</div>;
export const DateTimePicker = (p) => <div {...fixDomProps(p)}>DateTimePicker</div>;
// export const MuiPickersUtilsProvider = MuiPickersUtilsProvider
export const MuiPickersUtilsProvider = _MuiPickersUtilsProvider
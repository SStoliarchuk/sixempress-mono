import moment from 'moment';

/**
 * This class formats the data you give it to a specific type
 * to be read by the user
 * or used by be
 */
export class DataFormatterService {

	/**
	 * Transform a price from the cents version to the UI version
	 * 500 => 5.00
	 * @param cents Price in cents to transform
	 */
	static centsToScreenPrice(cents: number): string {
		return (cents / 100).toFixed(2);
	}

	/**
	 * Reverses the centsToString function
	 * .20 => 0.20
	 * 50.00 => 5000
	 * 50 => 5000
	 * 50,1 => 5010
	 * 50*02 => 5002
	 * @returns NaN if there is an error with the string
	 */
	static stringToCents(centsString: string): number {

		const matchToReplace = centsString.match(/^([0-9]*)[^0-9]?([0-9]*)$/);
		if (matchToReplace) {
			centsString = matchToReplace[1] + '.' + matchToReplace[2].substr(0, 2);
			if (centsString === '.') { return NaN; }
		} 
		// if doesn't match the first regex, nor this one, then it's an errpr
		else if (!centsString.match(/^[0-9]+$/)) {
			return NaN;
		}
		

		const splitPrice = centsString.split('.');
		if (splitPrice.length === 2) {
			return parseInt(splitPrice[0] + splitPrice[1].padEnd(2, '0'), 10);
		} else {
			return parseInt(splitPrice[0] + '00', 10);
		}
	}

	/**
	 * Transforms a price in numbers 100000 to 1'000.00
	 * @param cents The cents to transform
	 */
	static centsToBigNumber(cents: number): string {
		return this.numberWithCommas(this.centsToScreenPrice(cents));
	}

	/**
	 * Puts a thousans mark separator 
	 * 1000000 => 1'000'000
	 * 1000000.00 => 1'000'000.00
	 */
	static numberWithCommas(x: string | number) {
		return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
	}

	/**
	 * Transform a unix date to a readble date
	 * @param unix Unix date to transform
	 * @param customFormat Custom transform format (the one used for moment)
	 */
	static formatUnixDate(unix: number, customFormat?: string): string {
		return moment(unix * 1000).format(customFormat || 'DD/MM/YYYY HH:mm');
	}

	/**
	 * Replaces the \n newline with the <br/> tag to display it correctly in the HTML
	 * @param string Text to transform
	 */
	static replaceNewlineWithBrTag(string: string): string {
		return string.replace(/\n/g, '<br/>');
	}

	/**
	 * Transforms the single r|g|b value into hex
	 */
	private static componentToHex(c: number) {
		const hex = c.toString(16);
		return hex.length === 1 ? "0" + hex : hex;
	}
	
	/**
	 * Transforms rgb / rgba to hex
	 */
	static rgbToHex(r: number, g: number, b: number, a?: number) {
		return a 
		// tslint:disable: no-bitwise
		// eslint-disable-next-line
		? "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b) + ((a * 255) | 1 << 8).toString(16).slice(1)
		: "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
	}
	
	/**
	 * hex to rgb / rgba
	 * supports hex with alpha
	 * or manual alpha (the alpha in the hex value is overidden)
	 */
	static hexToRGB(hex: string, alpha?: number) {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		// tslint:disable-next-line: no-bitwise
		const a = alpha ? alpha : hex.slice(7, 9) ? parseInt(hex.slice(7, 9), 16) >> 8 : undefined;

		if (a === undefined) {
			return "rgb(" + r + ", " + g + ", " + b + ")";
		} else {
			return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
		}
	}

	/**
	 * Transforms an object to the console.log html equivalent
	 */
	static objToHtml(object: object, highlight?: boolean ): string {
		// transform to string
		const jsonString = this.replaceNewlineWithBrTag(
			// not working
			// JSON.stringify(object, undefined, '&nbsp;')
			// this works ._.
			JSON.stringify(object, undefined, '$#@!|')
			// remove special chars
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/\$#@!\|/g, '&nbsp;&nbsp;&nbsp;')
		);

		if (!highlight) { return jsonString; }
		
		// this function does some magic to replace the keys / values with <span> that has some custom classes for better syntax highlight
		return jsonString.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, (match) => {

				// start with number
				let valType = 'objToHtml_number';

				if (/^"/.test(match)) {
					// key
					if (/:$/.test(match)) {
						valType = 'objToHtml_key';
					} 
					// string
					else {
						valType = 'objToHtml_string';
					}
				} 
				// type boolean
				else if (/true|false/.test(match)) {
					valType = 'objToHtml_boolean';
				} 
				// type null
				else if (/null/.test(match)) {
					valType = 'objToHtml_null';
				}

				return '<span class=" objToHtml ' + valType + '">' + match + '</span>';
			});

	}

}

import { DataFormatterService } from "../data-formatter.service";
import moment from "moment";

describe("DataFormatterService data-formatter.service.ts", () => {

	it("centsToScreenPrice()", () => {
		expect(DataFormatterService.centsToScreenPrice(1000)).toBe("10.00");
		expect(DataFormatterService.centsToScreenPrice(0)).toBe("0.00");
		expect(DataFormatterService.centsToScreenPrice(3205)).toBe("32.05");
		expect(DataFormatterService.centsToScreenPrice(10000000)).toBe("100000.00");
	});

	it("stringToCents()", () => {
		expect(DataFormatterService.stringToCents("")).toBe(NaN);
		expect(DataFormatterService.stringToCents("1as")).toBe(NaN);
		expect(DataFormatterService.stringToCents("xx12")).toBe(NaN);

		expect(DataFormatterService.stringToCents(".20")).toBe(20);
		
		expect(DataFormatterService.stringToCents("1a")).toBe(100);

		expect(DataFormatterService.stringToCents("0")).toBe(0);
		expect(DataFormatterService.stringToCents("10")).toBe(1000);
		expect(DataFormatterService.stringToCents("10")).toBe(1000);
		expect(DataFormatterService.stringToCents("10.")).toBe(1000);
		expect(DataFormatterService.stringToCents("10.0")).toBe(1000);
		expect(DataFormatterService.stringToCents("10.00")).toBe(1000);
		
		expect(DataFormatterService.stringToCents("10010.10")).toBe(1001010);
		expect(DataFormatterService.stringToCents("10.10")).toBe(1010);
		expect(DataFormatterService.stringToCents("10>10")).toBe(1010);
		expect(DataFormatterService.stringToCents("10.1001")).toBe(1010);
		expect(DataFormatterService.stringToCents("10x1001")).toBe(1010);
		expect(DataFormatterService.stringToCents("10>10>10")).toBe(NaN);
	});

	it("centsToBigNumber()", () => {
		expect(DataFormatterService.centsToBigNumber(0)).toBe("0.00");
		expect(DataFormatterService.centsToBigNumber(100000)).toBe("1'000.00");
		expect(DataFormatterService.centsToBigNumber(100000000000)).toBe("1'000'000'000.00");
	});

	it("numberWithCommas()", () => {
		expect(DataFormatterService.numberWithCommas(0)).toBe("0");
		expect(DataFormatterService.numberWithCommas(1000)).toBe("1'000");
		expect(DataFormatterService.numberWithCommas(1000000000)).toBe("1'000'000'000");
	});

	it("formatUnixDate()", () => {
		const mom = moment();
		expect(DataFormatterService.formatUnixDate(mom.unix())).toBe(mom.format("DD/MM/YYYY HH:mm"));
		expect(DataFormatterService.formatUnixDate(mom.unix(), "MM/YYYY")).toBe(mom.format("MM/YYYY"));
	});

	it("replaceNewlineWithBrTag()", () => {
		expect(DataFormatterService.replaceNewlineWithBrTag("hello\nam dog\nye;")).toBe("hello<br/>am dog<br/>ye;");
		expect(DataFormatterService.replaceNewlineWithBrTag("hello<br/>\nam dog\nye;")).toBe("hello<br/><br/>am dog<br/>ye;");
	});
	
});

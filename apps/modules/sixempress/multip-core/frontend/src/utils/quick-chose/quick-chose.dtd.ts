import { SelectFieldValue } from "@sixempress/main-fe-lib";

export interface SelectQuickActionValue extends SelectFieldValue {
	visible?: boolean | (() => boolean);
}

export interface QPCProps {
	/**
	 * use the visible property to hide if the attr is not present or other cases
	 */
	values: SelectQuickActionValue[];

	/**
	 * the value is undefined when there is not choice after a scan
	 */
	onChose: (v?: SelectFieldValue['value'], remember?: boolean) => void;

	canRemember?: boolean;
}

export interface selectFnProps extends QPCProps {
	cacheKey: string;
	ignoreCache?: boolean;
}

export interface CachedChoice {
	value: SelectFieldValue['value'];
	idx: number;
}

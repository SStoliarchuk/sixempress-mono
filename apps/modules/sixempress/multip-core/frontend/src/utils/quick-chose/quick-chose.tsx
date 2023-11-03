import React from 'react';
import Button from "@material-ui/core/Button";
import Box from "@material-ui/core/Box";
import { SelectFieldValue, ModalComponentProps, DataStorageService, ModalService, FieldsFactory, OpenModalControls } from "@sixempress/main-fe-lib";
import { selectFnProps, CachedChoice, QPCProps, SelectQuickActionValue } from './quick-chose.dtd';


export class QuickChose {
	/**
	 * An external variables that allows you to keep only 1 prompt open at any time
	 */
	private static currentModal: OpenModalControls<any>;
	
	/**
	 * Uses a cached response or let the user chose a 
	 */
	public static selectQuickChoseOptions(p: selectFnProps) {
	
		// close last modal immediately as another item is being processed
		if (QuickChose.currentModal) {
			QuickChose.currentModal.close();
		}

		// check how many options there is
		const filtered = QuickChose.getFilteredValues(p.values);
		// nothing to chose
		if (filtered.length === 0) {
			p.onChose();
			return;
		} 
		// only 1 thing to chose
		else if (filtered.length === 1) {
			p.onChose(filtered[0].value);
			return;
		}



		// check if there is a cached choice
		if (p.ignoreCache !== true) {
			const cachedAnswer = DataStorageService.getSafeValue(p.cacheKey, 'object') as CachedChoice;
			// check cache
			if (
				// if the cache is present
				cachedAnswer && 
				// and if the cached values is the same as the values given 
				p.values[cachedAnswer.idx] && 
				p.values[cachedAnswer.idx].value === cachedAnswer.value && 
				// and the options is available
				QuickChose.isValueVisible(p.values[cachedAnswer.idx])
			) {
				p.onChose(cachedAnswer.value);
				return;
			}
		}
		
	
		/**
		 * save the choice of the user
		 * we have ...args just to be safe not to forget to pass possibile future arguments
		 */
		const onChose: QPCProps['onChose'] = (v: SelectFieldValue['value'], r?: boolean, ...args) => {
			// remember the choice
			if (r) { QuickChose.updateValueInCache(p.cacheKey, p.values, v); }
			// callback original function
			p.onChose(v, r, ...args);
		};
		
		// let the user chose the voice
		const propsToGive: QPCProps = {
			...p, 
			canRemember: typeof p.canRemember === 'undefined' ? true : p.canRemember, 
			onChose
		};
		QuickChose.openManual(propsToGive);
	}

	/**
	 * Opens the quick-chose modal manually
	 */
	public static openManual(p: QPCProps) {
		// close last modal
		if (QuickChose.currentModal) {
			QuickChose.currentModal.close();
			QuickChose.currentModal = undefined;
		}

		QuickChose.currentModal = ModalService.open(Prompt, p);
	}

	/**
	 * Updates the storage for the quick-chose key
	 * @param cacheKey the cache key relative to the values/value
	 * @param values all the values NOT FILTERED for the key
	 * @param value the chosen value, if not given or not present in values array, it removes the item from storage
	 */
	public static updateValueInCache(cacheKey: string, values: SelectQuickActionValue[], value?: any) {
		if (!value) {
			DataStorageService.localStorage.removeItem(cacheKey);
			return;
		}

		const idx = values.findIndex(p => p.value === value);
		if (idx === -1) {
			DataStorageService.localStorage.removeItem(cacheKey);
			return;
		}

		const choice: CachedChoice = { value: values[idx].value, idx, };
		DataStorageService.localStorage.setItem(cacheKey, JSON.stringify(choice));
	}

	/**
	 * Processes the visible property of an array of quick action values
	 */
	public static getFilteredValues(vs: SelectQuickActionValue[]): SelectFieldValue[] {
		return vs.filter(c => QuickChose.isValueVisible(c));
	}

	/**
	 * Processes the visible property of a quickaction value object
	 */
	public static isValueVisible(c: SelectQuickActionValue): boolean {
		if (typeof c.visible === 'undefined') {
			return true;
		}
		if (typeof c.visible === 'boolean') {
			return c.visible;
		}
		return c.visible();
	}

}


/**
 * The modal that allows the user to pick one value from the list
 */
function Prompt(p: QPCProps & ModalComponentProps) {

	const [remember, setRemember] = React.useState<boolean>(false);
	
	const changeRemember = (e?: any) => {
		setRemember(!remember);
	};
	
	const selectByIndex = (idx: number) => {
		if (!p.values[idx]) { 
			return;
		}

		if (p.canRemember) {
			p.onChose(p.values[idx].value, remember);
		} else {
			p.onChose(p.values[idx].value);
		}

		p.modalRef.close();
	};

	const keyboardChoice = (e: React.KeyboardEvent<any>) => {
		if (e.key && e.key.match(/^[0-9]$/)) {
			const idx = parseInt(e.key) - 1;
			selectByIndex(idx);
		}
	};

	const onClickValue = (e: React.MouseEvent<any>) => {
		const idx = e.currentTarget.dataset.idx;
		selectByIndex(idx);
	};

	
	/**
	 * Instead of removing the available voice from the list
	 * we just hide it, this function gets the visibilyty state of the choice
	 * 
	 * we hide instead of removing to keep the key shortctus the same for a better QOL
	 * and for better cache check
	 */
	return (
		<Box onKeyDown={keyboardChoice} p={2} zIndex={1}>
			{p.values.map((c, idx) => QuickChose.isValueVisible(c) && (
				<div key={idx}>
					{idx + 1 + ")"} <Button color='primary' data-idx={idx} onClick={onClickValue}>{c.menuLabel || c.label}</Button>
				</div>
			))}
			{p.canRemember && (
				<FieldsFactory.Switch
					autoFocus
					label="Ricorda scelta"
					checked={remember}
					onClick={changeRemember}
					color='primary'
				/>
			)}
		</Box>
	);

}


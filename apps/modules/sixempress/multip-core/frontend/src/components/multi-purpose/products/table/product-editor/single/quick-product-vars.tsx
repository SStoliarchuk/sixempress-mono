import React from 'react';
import { ProductVariant } from "apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/product-variants/ProductVariant";
import { DataStorageService } from "@sixempress/main-fe-lib";
import { MultiPCKeys } from "apps/modules/sixempress/multip-core/frontend/src/utils/enums/various";
import Chip from '@material-ui/core/Chip';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { ProductVariantController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/product-variants/prouctvariant.controller';

const STORE_LAST_N_PRODUCT_VARIANTS = 5;

type TypesAvailable = 'variant' | 'tag' | 'category' | 'internal_tags';
type Cache = {[type: string]: Array<{_id: string, name: string, chosenTimes: number, usedAtMs: number, data: ProductVariant['data']}>};

/**
 * Stores the variant in db for faster access
 * @param type The "category" where to store the variant info
 * @param obj The variant info themselves
 */
export function addQuickSettingToLastUsed(type: TypesAvailable, obj: ProductVariant) {
	const stored: Cache = DataStorageService.getSafeValue(MultiPCKeys.quickProductSettingsVars, 'object', 'localStorage') || {};

	if (!stored[type])
		stored[type] = [];
		
	const currMoment = new Date().getTime();
	const item = {
		_id: obj._id,
		name: obj.name,
		chosenTimes: 1,
		usedAtMs: currMoment,
		// store the data to quickly set it in UI instead of fetching each time
		// then we fetch in async, just to refresh this item in case it has changed
		data: obj.data,
	}

	const inArr = stored[type].findIndex(s => s._id === obj._id);
	// if in array then add the chosen tiems and replace
	if (inArr !== -1) {
		item.chosenTimes += stored[type][inArr].chosenTimes;
		stored[type][inArr] = item;
	}
	// otherwise add the item to array and ensure it does not overflow the max amounts
	else {
		stored[type].push(item);
		// sort and keep the latest N elements
		stored[type].sort((a, b) => a.usedAtMs - b.usedAtMs);
		stored[type].splice(STORE_LAST_N_PRODUCT_VARIANTS);
	}
	
	// sort by the most used 
	stored[type].sort((a, b) => b.chosenTimes - a.chosenTimes)
	// update the storage
	DataStorageService.set(MultiPCKeys.quickProductSettingsVars, stored, 'localStorage');
}

export function removeQuickSettingToLastUsed(type: TypesAvailable, id: string) {
	const stored: Cache = DataStorageService.getSafeValue(MultiPCKeys.quickProductSettingsVars, 'object', 'localStorage');
	if (!stored)
		return;

	if (!stored[type])
		return;

	const idx = stored[type].findIndex(i => i._id === id);
	if (idx === -1)
		return;

	stored[type].splice(idx, 1);
	DataStorageService.set(MultiPCKeys.quickProductSettingsVars, stored, 'localStorage');
}

export function QuickCachedSettings(p: {type: TypesAvailable, containClassName?: string, onChose: (i: ProductVariant['data'], _id: string) => void}) {
	const [data, setData] = React.useState(((DataStorageService.getSafeValue(MultiPCKeys.quickProductSettingsVars, 'object', 'localStorage') as Cache) || {})[p.type] || []);

	const onDelete = (e: React.MouseEvent<any>) => {
		const id = e.currentTarget.parentElement.dataset.id;
		const idx = data.findIndex(i => i._id === id);
		if (idx === -1)
			return;

		const n = [...data];
		n.splice(idx, 1);
		setData(n);

		removeQuickSettingToLastUsed(p.type, id);
	}

	const onClick = (e: React.MouseEvent<any>) => {
		const id = e.currentTarget.dataset.id;
		const item = data.find(i => i._id === id);
		if (!item) 
			return;

		p.onChose(item.data, id);

		// after we choose, we update the item chosen with the correct data in async
		// this way we dont stop the user
		new ProductVariantController().getSingle(id, {disableLoading: true})
		.then(i => {
			if (i)
				addQuickSettingToLastUsed(p.type, i)
			else 
				removeQuickSettingToLastUsed(p.type, id);
		})
		// dont do anything on error
		.catch(() => {})
	};

	if (!data.length)
		return (null);

	return (
		<div className={'quick_product_vars_chips ' + (p.containClassName || '') }>
			{data.map(d => (
				<Chip key={d._id} label={d.name} variant='outlined' color='primary' data-id={d._id} onClick={onClick} onDelete={onDelete} />
			))}
		</div>
	)
}
import { HookFilters } from "@stlse/frontend-connector";
import { Attribute, AttributeLabel } from '../../utils/enums/attributes';
import { LibAttribute, LibAttributeLabel } from '@sixempress/main-fe-lib';

type AttList = {title: string, values: Array<{title: string, value: number | string}>};

export const userroleHooks: HookFilters = {
	sxmp_labac_attributes_required_mapping(context, return_value, n) {
		return [
			...return_value,
			{
				attribute: Attribute.addProducts,
				dependent: [Attribute.viewInventoryCategories, Attribute.viewSuppliers, Attribute.viewProductBuyPrice, Attribute.viewProductSellPrice],
			},
			{
				attribute: Attribute.modifyProducts,
				dependent: [Attribute.viewInventoryCategories, Attribute.viewSuppliers, Attribute.viewProductBuyPrice, Attribute.viewProductSellPrice],
			},
			{
				attribute: Attribute.addSales,
				dependent: [Attribute.viewProductSellPrice, Attribute.viewProductMovements, Attribute.viewProducts],
			},
			{ 
				attribute: Attribute.viewRawFiles, 
				dependent: [Attribute.viewExternalConnection],
			},

			// all things that need customer
			{ attribute: Attribute.viewCustomerOrder,   dependent: [Attribute.viewCustomers] },
			{ attribute: Attribute.addCustomerOrder,    dependent: [Attribute.viewCustomers] },
			{ attribute: Attribute.modifyCustomerOrder, dependent: [Attribute.viewCustomers] },
			{ attribute: Attribute.viewSales,           dependent: [Attribute.viewCustomers] },
			{ attribute: Attribute.addSales,            dependent: [Attribute.viewCustomers] },
			{ attribute: Attribute.modifySales,         dependent: [Attribute.viewCustomers] },
			{ attribute: Attribute.viewSaleAnalysis,    dependent: [Attribute.viewCustomers] },
			{ attribute: Attribute.addSaleAnalysis,     dependent: [Attribute.viewCustomers] },
			{ attribute: Attribute.modifySaleAnalysis,  dependent: [Attribute.viewCustomers] },
		]
	},
	// execute after all defaults one
	// to make sure we do not push already present items
	// as we share the LibAttribute with labac
	sxmp_labac_get_attribute_group_lists: {
		priority: 11,
		fn: (context, return_value, n) => {
			return [
				...return_value,
				...MultipUserRoleController.getAttributesList(return_value),
			]
		},
	}
}

class MultipUserRoleController  {
	
	static cachedAttList: AttList[];

	/**
	 * Returns the available attributes for the category that is being used
	 */
	public static getAttributesList(return_value: AttList[]): AttList[] {
		if (this.cachedAttList)
			return this.cachedAttList;

		const r: AttList[] = [];
		const add: AttList = {
			title: 'Aggiuntivi',
			values: [],
		};

		// prepare data
		const labels = {...LibAttributeLabel, ...AttributeLabel};
		const attrs = {...LibAttribute, ...Attribute};
		const alreadyPresent = new Set();
		for (const r of return_value)
			for (const v of r.values)
				alreadyPresent.add(v.value);

		// iterate and create
		for (const k in attrs) {
			const a = attrs[k];

			if (alreadyPresent.has(a))
				continue;

			if (typeof a !== 'number') {
				add.values.push({title: labels[a] || a, value: a});
				continue;
			}

			if (a % 1000 === 0)
				r.push({title: labels[a].replace('Visualizzare ', ''), values: []});

			r[r.length - 1].values.push({title: String(labels[a] || a), value: a});
		}

		if (add.values.length)
			r.push(add);

		this.cachedAttList = r;
		return r;
	}

}


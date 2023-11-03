import Table from '@material-ui/core/Table';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableBody from '@material-ui/core/TableBody';
import { BusinessLocationsService, FieldsFactory,  DataFormatterService } from '@sixempress/main-fe-lib';
import { AuthService } from '@sixempress/abac-frontend';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { Product } from './Product';
import { ProductGroup } from './ProductGroup';

export type ProductTableExtraSelectProps = {
	isSelected: (p: Product) => boolean, 
	onSelect: (p: Product) => void
};

type PreColumn = 'qt' | 'variant' | 'category' | 'supplier' | 'buyPrice' | 'sellPrice' | 'barcode';
type CustomColumn = {th: any, td: (i: Product) => any};
type OverrideColumns = (PreColumn | CustomColumn)[]

export class ProductsJsxRender {

	public static readonly DEFAULT_TABLE_COLUMNS: Readonly<OverrideColumns> = Object.freeze(['variant', 'qt', 'category', 'supplier', 'buyPrice', 'sellPrice', 'barcode']);

	public static divideByType(p: Product[]) {
		const byType: {[pt: string]: Product[]} = {};
		for (const i of p) {
			if (!byType[i.groupData.type]) {
				byType[i.groupData.type] = [];
			}
			byType[i.groupData.type].push(i);
		}
		return byType;
	}

	public static MixedTypeTable(p: {prods: Product[], selectOpts?: ProductTableExtraSelectProps}) {
		const byType = ProductsJsxRender.divideByType(p.prods);
		return (
			<>
				{Object.keys(byType).map(pt => (
					<ProductsJsxRender.Table key={pt} prods={byType[pt]} selectOpts={p.selectOpts}/>
				))}
			</>
		)
	}

	public static Table(p: {
		prods: Product[], 
		selectOpts?: ProductTableExtraSelectProps,
		expandContainer?: boolean,
		customColumns?: OverrideColumns,
	}) {

		const cols = ProductsJsxRender.mapTableCustomColumns(p.customColumns || ProductsJsxRender.DEFAULT_TABLE_COLUMNS as OverrideColumns);
		return (
			<TableContainer className={p.expandContainer ? 'def-box-expand' : undefined}>
				<Table size='small' className='nowrap'>
					<TableHead>
						<TableRow>
							{p.selectOpts && <TableCell className='w-1'></TableCell>}
							{cols.map((c, i) => (
								<TableCell key={String(c) + i}>{c.th}</TableCell>
							))}
						</TableRow>
					</TableHead>
					<TableBody>
						{p.prods.map(cur => (
							<TableRow key={cur._id} onClick={p.selectOpts && (() => p.selectOpts.onSelect(cur))}>
								{p.selectOpts && (<TableCell> <FieldsFactory.Checkbox size='small' checked={p.selectOpts.isSelected(cur)}/> </TableCell>)}
								{cols.map((c, i) => (
									<TableCell key={cols.length + i}>{c.td(cur)}</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>
		)
	}

	/**
	 * As to allow to override the table th/tds BUT at the same time dont have to rewrite the attrs logic elsewere
	 * we create this logic that maps the already present logic to a string
	 */
	private static mapTableCustomColumns(cols: OverrideColumns): CustomColumn[] {
		const tor: CustomColumn[] = [];

		for (const c of cols) {
			if (typeof c === 'object') {
				tor.push(c);
			}
			else {
				switch (c) {
					
					case 'barcode':
						tor.push({th: 'Barcode', td: (p) => p.infoData.barcode.join(', ')});
						break;

					case 'variant':
						tor.push({th: 'Variante', td: (p) => ProductsJsxRender.formatProductVariantName(p)});
						break;

					case 'qt':
						AuthService.isAttributePresent(Attribute.viewProductMovements) && 
							tor.push({th: 'Quantita\'', td: (p) => ProductsJsxRender.generateFullAmountInfo(p)});
						break;

					case 'category':
						AuthService.isAttributePresent(Attribute.viewInventoryCategories) && 
							tor.push({th: 'Categoria', td: (p) => p.groupData.category ? p.groupData.category.fetched.name : ""});
						break;

					case 'supplier':
						AuthService.isAttributePresent(Attribute.viewSuppliers) && 
							tor.push({th: 'Fornitore', td: (p) => p.variationData.supplier ? p.variationData.supplier.fetched.name : ""});
						break;

					case 'buyPrice':
						AuthService.isAttributePresent(Attribute.viewProductBuyPrice) && 
							tor.push({th: 'Prezzo d\'acquisto', td: (p) => typeof p.variationData.buyPrice === 'undefined' ? "" : "€ " + DataFormatterService.centsToScreenPrice(p.variationData.buyPrice)});
						break;

					case 'sellPrice':
						AuthService.isAttributePresent(Attribute.viewProductSellPrice) && 
							tor.push({th: 'Prezzo di Vendita', td: (p) => typeof p.variationData.sellPrice === 'undefined' ? "" : "€ " + DataFormatterService.centsToScreenPrice(p.variationData.sellPrice)});
						break;
				}
			}
		}

		return tor;
	}

	/**
	 * Generates ALL the informations about a products quantities
	 */
	public static generateFullAmountInfo(item: Pick<Product, '_amountData' | '_reservedData' | '_returnedData' | '_incomingData'>): string | JSX.Element {

		// number[0] => curr amount
		// number[1] => reserved
		// number[2] => returned/damaged
		const fields: (keyof Product)[] = ['_amountData', '_reservedData', '_returnedData', '_incomingData'];
		const builtData: {[loc: string]: [number, number, number, number]} = {};
		const totals: [number, number, number, number] = [0, 0, 0, 0];

		// generate datas
		for (let i = 0; i < fields.length; i++) {
			const f = fields[i];
			const amounts = item[f] || {};
			
			for (const locId in amounts) {
				if (!builtData[locId])
					builtData[locId] = [0, 0, 0, 0];

				builtData[locId][i] += amounts[locId];
				totals[i] += amounts[locId];
			}
		}
		
		// if no loc = no item
		const bLocs = Object.keys(builtData);
		if (bLocs.length === 0)
			return '0';
		
		// get all locations for a product
		const locs = BusinessLocationsService.getAllLocations(true);
		
		// if the location is just one and is the same
		if (bLocs.length === 1 && locs.length === 1 && bLocs[0] === locs[0]._id) {
			
			const jsx: (string | number | JSX.Element)[] = [];
			for (let i = 0; i < builtData[bLocs[0]].length; i++)
				jsx.push(ProductsJsxRender.singleAmountFormat(builtData[bLocs[0]][i], i));

			return <>{jsx}</>;
		}

		// else build detailed table with all the locs
		return (
			<table>
				<tbody>
					{bLocs.map((loc, i) => (
						<tr key={loc}>
							<td>{BusinessLocationsService.getNameById(loc)}</td>
							{builtData[loc].map((am, i) => {
								const str = ProductsJsxRender.singleAmountFormat(am, i);
								return str ? <td key={loc + i}>{str}</td> : (null);
							})}
						</tr>
					))}
					{bLocs.length > 1 && (
						<tr>
							<td>Totale</td>
							{totals.map((am, i) => {
								const str = ProductsJsxRender.singleAmountFormat(am, i);
								return str ? <td key={am}>{str}</td> : (null);
							})}
						</tr>
					)}
				</tbody>
			</table>
		)

	}

	/**
	 * A function that formats the amounts strings
	 * keeping outside just to not have it inside the main format function
	 */
	private static singleAmountFormat(amount: number, i: number): number | string | JSX.Element {
		switch(i) {
			// return as string to not return a falsy element when it's zero
			case 0:  return amount + ' ';
			case 1:  return amount ? <span> (pr&nbsp;{amount}) </span> : ' ';
			case 2:  return amount ? <span> (rs&nbsp;{amount}) </span> : ' ';
			case 3:  return amount ? <span> (in&nbsp;{amount}) </span> : ' ';
			default: return amount ? ' (' + amount + ') ' : ' ';
		}
	}

	/**
	 * adds parentheses around variant values
	 */
	public static formatProductVariantName(prod: Product | ProductGroup): string {
		if (!prod.variationData?.variants?.length)
			return '';

		// add all but the last with commas
		let tor = '(';
		for (let i = 0; i < prod.variationData.variants.length - 1; i++)
			tor += prod.variationData.variants[i].value + ', ';

		// add the last missing withouth commas
		return tor + prod.variationData.variants[prod.variationData.variants.length - 1].value + ')';
	}

	/**
	 * example `iPhone 32GB (445687) (Red)`
	 * @returns `name (tag1, tag2, tag3) (varVal1, varVal2, varVal3)`
	 */
	public static formatFullProductName(prod: Product | ProductGroup): string {
		// unique codes
		return ProductsJsxRender.formatProductTags(prod, true) +
			// name
			prod.groupData.name + ' ' + 
			// internal tags
			ProductsJsxRender.formatProductTags(prod, false) +
			// variant
			ProductsJsxRender.formatProductVariantName(prod);
	}

	public static formatProductTags(prod: Product | ProductGroup, parseUniqueTags: boolean): string {
		return parseUniqueTags 
			? (prod.groupData.uniqueTags?.length ? '[' + prod.groupData.uniqueTags.join(', ') + '] ' : '')
			: (prod.groupData.internalTags?.length ? '[' + prod.groupData.internalTags.join(', ') + '] ' : '');
	}

	/**
	 * Generates the table showing the amounts of the product
	 */
	public static generateAmountTable(amounts: Product['_amountData']): string | JSX.Element {
		return ProductsJsxRender.generateFullAmountInfo({_amountData: amounts})
	}
	


}
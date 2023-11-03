import React from 'react';
import { ProductGroup } from "./ProductGroup";
import { DbObjectSettings, AbstractDbItemController, IClientApiRequestOptions, DataFormatterService, ModalService, ModalComponentProps, } from "@sixempress/main-fe-lib";
import { AuthService } from '@sixempress/abac-frontend';
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { Observable } from "rxjs";
import { Product} from './Product';
import { ProductsJsxRender, ProductTableExtraSelectProps } from './products-render';
import FormHelperText from '@material-ui/core/FormHelperText';
import Button from '@material-ui/core/Button';
import { Attribute } from '../../../utils/enums/attributes';

export class ProductGroupController extends AbstractDbItemController<ProductGroup> {


	bePath = BePaths.products;
	modelClass = ModelClass.Product;
	
	protected fetchInfo: DbObjectSettings<ProductGroup> = {
		groupData: {
			category: { },
		},
		variationData: {
			supplier: { },
		}, 
		models: [{
			groupData: {
				category: { },
			},
			variationData: { 
				supplier: {  }
			},
		}]
	};

	/**
	 * Opens a model that shows the detail of the product
	 * and takes the parames either from `data-id` and `data-type` attributs
	 * or 
	 * from the passed manual params
	 * @param eOrGid React.Mouse event (fired onClick) or the product group id
	 * @param givenType the type of the product: replaceemnt|product
	 */
	public static openProductGroupDetail(eOrGid: React.MouseEvent<any> | string) {
		const id = typeof eOrGid === 'string' ? eOrGid : eOrGid.currentTarget.dataset.id;
		if (!id || !AuthService.isAttributePresent(Attribute.viewProducts))
			return;

		ModalService.open(
			{title: 'Dettagli Prodotto', content: ProductGroupController.FullDetailJsx},
			{id: id},
		);
	}

	public renderFullObjectDetails = (id: string, opts: IClientApiRequestOptions<ProductGroup>): Observable<() => JSX.Element> => {
		return new Observable((obs) => {
			if (opts.params) 
				delete opts.params.projection;
			
			this.getSingle(id, {disableLoading: true, params: {...opts.params, fetch: true}})
			.catch(e => obs.error(e))
			.then((i) => {
				obs.next(i ? () => this.getDetailsRender(i as any) : () => <b>Elemento non trovato</b>)
			})
		});
	}

	public renderFullObjectDetailsSelectMode = (id: string, opts: ProductTableExtraSelectProps & IClientApiRequestOptions<ProductGroup>): Observable<() => JSX.Element> => {
		return new Observable((obs) => {
			if (opts.params) 
				delete opts.params.projection;

			this.getSingle(id, {disableLoading: true, params: {fetch: true}})
			.catch(e => obs.error(e))
			.then((i) => {
				obs.next(i ? () => this.getDetailsRender(i as any, opts) : () => <b>Elemento non trovato</b>)
			})
		});
	}

	protected getDetailsRender(item: ProductGroup, selectMode?: ProductTableExtraSelectProps) {
		return ProductGroupController.generatePeekPreview(item, selectMode);
	}

	public static onMultipleBarcodeProducts(choices: Product[], onChoice: (p: Product) => void) {
		
		if (choices.length === 0)
			return;

		if (choices.length === 1)
			return onChoice(choices[0]);

		// show the latest created at the start
		choices.sort((a, b) => b._created._timestamp - a._created._timestamp);

		ModalService.open({title: 'Scelta Prodotto', content: (props: ModalComponentProps) => {
			return (
				<>
					Il Barcode corrisponde a piu' prodotti.<br/>
					Scegli quello corretto:
					<br/>
					<br/>
					<table className='sale-multiple-barcodes-choice'>
						<tbody>
							{choices.map(c => (
								<tr key={c._id}>
									<td>
										{c.variationData.variants.map(c => c.value).join(', ')}
										<div style={{position: 'absolute'}}>
											<FormHelperText>
												{DataFormatterService.formatUnixDate(c._created._timestamp)}
											</FormHelperText>
										</div>
									</td>
									{/* <td>{SupplierController.formatName(c.variationData.supplier)}</td> */}
									<td>€&nbsp;{DataFormatterService.centsToScreenPrice(c.variationData.sellPrice)}</td>
									<td><Button color='primary' onClick={() => {props.modalRef.close(); onChoice(c)}}>Seleziona</Button></td>
								</tr>
							))}
						</tbody>
					</table>
				</>
			)
		}});
	}

	private static generatePeekPreview(productToShow: ProductGroup, select?: ProductTableExtraSelectProps) {
		return (
			<div className='peek-div-info-container'>
				<div className='peek-div-info-card'>
					<table className='peek-card-table'>
						<tbody>
							<tr>
								<th>Nome: </th>
								<td>{productToShow.groupData.name}</td>
							</tr>
							{productToShow.groupData.uniqueTags && productToShow.groupData.uniqueTags.length !== 0 && (
								<tr>
									<th>Codici Univoci: </th>
									<td>{productToShow.groupData.uniqueTags.join(', ')}</td>
								</tr>
							)}
							{productToShow.groupData.internalTags && productToShow.groupData.internalTags.length !== 0 && (
								<tr>
									<th>Tag Interni: </th>
									<td>{productToShow.groupData.internalTags.join(', ')}</td>
								</tr>
							)}
							{productToShow.groupData.tags && productToShow.groupData.tags.length !== 0 && (
								<tr>
									<th>Tag: </th>
									<td>{productToShow.groupData.tags.join(', ')}</td>
								</tr>
							)}
							{productToShow.groupData.category && (
								<tr>
									<th>Categoria principale: </th>
									<td>{productToShow.groupData.category.fetched.name}</td>
								</tr>
							)}
							{productToShow.models.length === 1 && productToShow.models[0].variationData.variants.length !== 0 && (
								<tr>
									<th>Variazione: </th>
									<td>
										{productToShow.models[0].variationData.variants.reduce((variantCar, variant, idx) => {
											variantCar += variant.value;
											if (idx !== productToShow.models[0].variationData.variants.length - 1) { variantCar += ' | '; }
											return variantCar;
										}, '')}
									</td>
								</tr>
							)}
							{typeof productToShow.variationData.buyPrice !== 'undefined' && (
								<tr>
									<th>Prezzo d'acquisto: </th>
									<td>€ {DataFormatterService.centsToScreenPrice(productToShow.variationData.buyPrice)}</td>
								</tr>
							)}
							{typeof productToShow.variationData.sellPrice !== 'undefined' && (
								<tr>
									<th>Prezzo di vendita: </th>
									<td>€ {DataFormatterService.centsToScreenPrice(productToShow.variationData.sellPrice)}</td>
								</tr>
							)}
							{productToShow.variationData.supplier && (
								<tr>
									<th>Fornitore: </th>
									<td>{productToShow.variationData.supplier.fetched.name}</td>
								</tr>
							)}
							{productToShow.groupData.description && (
								<tr>
									<th>Descrizione: </th>
									<td>{productToShow.groupData.description}</td>
								</tr>
							)}
							{productToShow.infoData?.barcode && (
								<tr>
									<th>Barcode: </th>
									<td>{productToShow.infoData?.barcode.join(", ")}</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{AuthService.isAttributePresent(Attribute.viewProductMovements) && productToShow.models.length === 1 && (
					<div className='peek-div-info-card'>
						<b>Quantita'</b>
						<div>
							{ProductsJsxRender.generateFullAmountInfo(productToShow.models[0])}
						</div>
					</div>
				)}
			
				{productToShow.models.length !== 1 && (
					<>
						<div className='peek-div-info-card mw-100 w-100 pl-0 pr-0'>
							<b>&nbsp;Dettagli</b>
							<div>
								<ProductsJsxRender.Table prods={productToShow.models.filter(p => !p._deleted)} selectOpts={select}/>
							</div>
						</div>
						
						{productToShow.models.filter(p => p._deleted).length !== 0 && (
							<div className='peek-div-info-card mw-100 w-100 pl-0 pr-0'>
								<b>&nbsp;Giacenza Aggiuntiva</b>
								<div>
									<ProductsJsxRender.Table prods={productToShow.models.filter(p => p._deleted)} selectOpts={select}/>
								</div>
							</div>
						)}
					</>
				)}

			</div>
		);
	}

}

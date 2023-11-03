import React from 'react';
import { FieldsFactory, AbstractBasicDt, ICustomDtSettings,  DtFiltersSetting, ModalService, ABDTProps, ABDTAdditionalSettings, ModalComponentProps, SmallUtils, } from "@sixempress/main-fe-lib";
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { ProductVariant, ProductVarTypes, ProductVarTypesLabel } from "./ProductVariant";
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import { ProductVariantController } from './prouctvariant.controller';
import { LibSmallUtils } from 'libs/main-fe-lib/src/app/utils/various/small-utils';

interface PVTProps<T> extends ABDTProps<T> {
	typeFilter?: ProductVarTypes[],
}

export class ProductVariantsTable extends AbstractBasicDt<ProductVariant, PVTProps<ProductVariant>> {

	controller = new ProductVariantController();

	static openSelectModal(onSelect: (item: ProductVariant) => void, types?: ProductVarTypes[]) {
		const modal = ModalService.open(
			ProductVariantsTable, 
			{
				typeFilter: types,
				isEmbedded: 'select', 
				emeddedData: {
					selectMode: "single",
					onSelectConfirm: (ids: string[], is) => { 
						modal.close(); 
						
						// if there are type filter ensure we return the correct type only
						if (types && is[0] && !types.includes(is[0].data.type))
							return;

						onSelect(is[0] as any); 
					}, 
				}
			}, {maxWidth: 'md', fullWidth: true}
		);
		return modal;
	}


	toolbarAddition = () => null;

	componentDidMount() {
		super.componentDidMount();

		if (this.props.typeFilter)
			this.setState({dtFiltersComponentValue: {'data.type': {$in: this.props.typeFilter}}});
	}

	controllerUrl = BePaths.productvariants;
	modelClass = ModelClass.ProductVariant;

	removeButtonsOnSelectMode = false;

	additionalSettings: ABDTAdditionalSettings<ProductVariant> = { 
		projection: {'data': 1},
	};

	getDtOptions(): ICustomDtSettings<ProductVariant> {
		const toR: ICustomDtSettings<ProductVariant> = {
			buttons: [
				{
					title: 'Rinomina',
					attributes: { required: [Attribute.modifyProductVariants] },
					select: { type: "single", },
					onClick: (e, dt) => {
						const r = this.getRowData(dt);
						ModalService.open(
							VariantName,
							{ callback: (name) => {
								this.controller.patch(r._id, [{op: 'set', path: 'name', value: name}])
								.then(r => {
									LibSmallUtils.notify("Variante modificata", 'success');
									this.reloadTable();
								});
							} }
						);
					},
				},
				{
					title: 'Elimina',
					props: {color: 'secondary'},
					attributes: { required: [Attribute.deleteProductVariants] },
					select: { type: "single", },
					onClick: (e, dt) => this.sendDeleteRequest(dt),
				},
			],
			columns: [
				{
					title: 'Nome',
					data: 'name'
				},
				{
					title: 'Tipo',
					data: 'data.type',
					render: (v) => ProductVarTypesLabel[v],
				},
			],
			renderDetails: (data) => <ProductVariantController.FullDetailJsx id={data._id}/>,
		};

		return toR;
	}

}


export function VariantName(prop: ModalComponentProps & {callback: (val: string) => void}) {
	const [val, setVal] = React.useState('');

	const onChange = (e: any) => {
		setVal(e.currentTarget.value);
	};

	const onSubmit = (e: React.FormEvent<any>) => {
		e.preventDefault();

		if (val) {
			prop.callback(val);
			prop.modalRef.close();
		}
	};

	return (
		<Box p={2}>
			<form onSubmit={onSubmit}>
				<h2>Inserire il nome per salvare la combinazione</h2>
				<FieldsFactory.TextField label='Nome' value={val} autoFocus onChange={onChange} fullWidth variant='outlined' error={!val}/>
				<Box display='flex' pt={1} flexDirection='row-reverse'>
					<Button type='submit' color='primary'>Conferma</Button>
				</Box>
			</form>
		</Box>
	);

}
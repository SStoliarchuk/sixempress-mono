import { SupplierReturn, SupplierReturnStatusLabel } from '../SupplierReturn';
import { AbstractBasicDt, ICustomDtSettings, DataFormatterService,  ABDTAdditionalSettings, DtFiltersSetting, TableVariation, ReactUtils } from '@sixempress/main-fe-lib';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { SupplierReturnController } from '../SupplierReturn.controller';
import { SupplierController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/suppliers/supplier.controller';

export class SupplierReturnsTable extends AbstractBasicDt<SupplierReturn> {

	controller = new SupplierReturnController();

	additionalSettings: ABDTAdditionalSettings<SupplierReturn> = {
		searchFields: [
			{data: 'list.products.item.fetched.groupData.name'},
			{data: 'list.products.item.fetched.groupData.uniqueTags'},
			// {data: 'list.products.item.fetched.variationData.supplier.fetched.name'},
		]
	}

	filterSettings: DtFiltersSetting<SupplierReturn> = {
		addCreationTimeFilter: false,
		timeFields: [{
			label: 'Entrata',
			modelPath: 'date',
		}],
		selectFields: [{
			label: 'Stato Reso',
			modelPath: 'status',
			multiple: true,
			availableValues: Object.values(SupplierReturnStatusLabel).filter(i => typeof i === 'number').map(i => ({value: i, label: SupplierReturnStatusLabel[i]}))
		}],
		amtsFields: [{
			modelPath: 'list.products.item.fetched.variationData.supplier',
			textFieldProps: { label: 'Fornitore' },
			...SupplierController.AmtsFieldProps(undefined, { label: 'Fornitore' }),
		}]
	};

	protected getDtOptions(): ICustomDtSettings<SupplierReturn> {
		return {
			buttons: [
				{
					title: 'Aggiungi',
					attributes: { required: [Attribute.addSupplierReturn] },
					onClick: () => {
						this.openEditor();
					}
				},
				{
					title: 'Modifica',
					attributes: { required: [Attribute.modifySupplierReturn] },
					select: {type: 'single', enabled: (model) => !model.endDate, },
					onClick: (event, dt) => this.openEditor(dt)
				},
				// {
				// 	title: 'Elimina',
				// 	props: {color: 'secondary'},
				// 	attributes: { required: [Attribute.deleteSupplierReturns] },
				// 	select: { type: "single" },
				// 	onClick: (e, dt) => this.sendDeleteRequest(dt)
				// },
			],
			columns: [
				{
					title: 'Cod',
					data: '_progCode',
					search: { toInt: true },
				},
				{
					title: 'Data',
					data: 'date',
					search: false,
					render: (d) => DataFormatterService.formatUnixDate(d),
				},
				{
					title: 'Stato',
					data: 'status',
					render: (s, m) => <ReactUtils.SelectChangeField model={m} field='status' enumLabel_to_Value={SupplierReturnStatusLabel} controller={new SupplierReturnController()}/>,
				},
			],
			renderDetails: (item) => <SupplierReturnController.FullDetailJsx id={item._id}/>,
		};
	}

}

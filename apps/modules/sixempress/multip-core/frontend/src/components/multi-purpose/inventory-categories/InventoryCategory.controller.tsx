import { IconButton, TextFieldProps } from "@material-ui/core";
import { Close } from "@material-ui/icons";
import { AbstractDbItemController, DbObjectSettings, FetchableField, FieldsFactory, ModalService, } from "@sixempress/main-fe-lib";
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { AbstractControl } from "react-reactive-form";
import { ProductCategoriesList } from "./inventory-categories.list";
import { InventoryCategory } from "./InventoryCategories";
import { IICLProps } from "./util-components";

export class InventoryCategoryController extends AbstractDbItemController<InventoryCategory> {
	
	bePath = BePaths.inventorycategories;
	modelClass = ModelClass.InventoryCategory;

	protected fetchInfo: DbObjectSettings<InventoryCategory> = {
		extends: {
		}
	};

	public static getFormControl_AmtsField = (p: TextFieldProps) => (control: AbstractControl) => {
		return (
			<InventoryCategoryController.AmtsField
				{...p}
				onChange={(c) => control.setValue(c ? new FetchableField(c._id, ModelClass.InventoryCategory, c) : null)}
				value={control.value ? control.value.fetched.name : ''}
				error={control.invalid}
			/>
		);
	}

	public static AmtsField = function AmtsField(p: {onChange: (c?: InventoryCategory) => void} & TextFieldProps) {

		const onChange = (c?: InventoryCategory) => {
			p.onChange(c);
		};

		const fn = () => InventoryCategoryController.openSelectCategoryDialog({
			selectCategoryMode: {selectFn: onChange}
		});

		const onClickClear = (e: React.MouseEvent<any>) => {
			e.stopPropagation();
			onChange();
		};

		return (
			<FieldsFactory.TextField
				label={'Categoria'}
				variant='outlined'
				fullWidth={true}
				className={'input-pointer'}
				onClick={fn}
				onKeyDown={fn}
				InputProps={p.value && {endAdornment: (
					<IconButton onClick={onClickClear}>
						<Close/>
					</IconButton>
				)}}
				onFocus={(e) => {(window as any).asd = {e: e, ect: e.currentTarget}; }}
				{...p}
			/>
		)
	}

	private static openSelectCategoryDialog(props: IICLProps) {
		// TODO find out why the props type is any ?
		// return ModalService.open(ProductCategoriesList, {}, {maxWidth: 'lg', fullWidth: true});
		
		return ModalService.open(ProductCategoriesList, props, {maxWidth: 'lg', fullWidth: true});
	}
	
}

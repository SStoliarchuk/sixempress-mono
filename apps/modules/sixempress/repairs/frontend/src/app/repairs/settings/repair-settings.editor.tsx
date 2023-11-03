import { TopLevelEditorPart, AbstractEditor, AbstractEditorProps, RequestService, ObjectUtils, AuthService, ModalService, W } from "@sixempress/main-fe-lib";
import { Observable } from "rxjs";
import { ISxmpRepairsSettings } from './repair-settings.dtd';
import { BePaths } from '../../../enums/bepaths';
import { Attribute } from "../../../enums/attributes";
import { Button } from "@material-ui/core";


export function RepairSettingEditButton() {
	if (!AuthService.isAttributePresent(Attribute.addRepairs))
		return null;

  const openLocationEditor = () => {
		ModalService.open(RepairSettingEditor, {extendWrapper: true}, {
			maxWidth: "md", 
			fullWidth: true,
			PaperProps: { style: { backgroundColor: "transparent", boxShadow: "none" } },
		});
	}

  return (<W><Button color='primary' onClick={openLocationEditor}>Modifica PDF riparazioni</Button></W>)
}

abstract class OverrideType<T> extends AbstractEditor<T> { }

export class RepairSettingEditor extends OverrideType<ISxmpRepairsSettings> {

	controller = null;
	controllerUrl = BePaths.repairsettingsinfo;

	requireDocumentLocation = false;
	requireDocumentLocationsFilter = false;

	getEditorConfiguration(): AbstractEditorProps<ISxmpRepairsSettings> {
		return { ...super.getEditorConfiguration(), usePut: true, idToModify: "" };
	}

	/**
	 * Resolves to undefined when no item was found
	 * Resolves to the ITEM to modify if found
	 */
	protected getEditorRelativeItem(): Observable<ISxmpRepairsSettings> {
		return new Observable(obs => {
			RequestService.client('get', this.controllerUrl)
			.then(res => (obs.next(res.data), obs.complete()));
		});
	}

	generateEditorSettings(val: ISxmpRepairsSettings = {} as any): TopLevelEditorPart<ISxmpRepairsSettings>[] {
		return [
			{
				type: 'jsx',
				component: (<h3 style={{margin: 0}}><b>PDF Accettazione</b></h3>)
			},
			{
				type: 'formGroup',
				logic: {
					key: 'entrancePdf',
					parts: [
						{
							type: 'formControl',
							logic: {
								label: 'Titolo Entrata',
								component: 'TextField',
								key: 'title',
							}
						},
					]
				}
			},
			{type: 'divider'},
			{
				type: 'jsx',
				component: (<h3 style={{margin: 0}}><b>PDF Uscita</b></h3>)
			},
			{
				type: 'formGroup',
				logic: {
					key: 'interventPdf',
					parts: [
						{
							type: 'formControl',
							logic: {
								label: 'Titolo Uscita',
								component: 'TextField',
								key: 'title',
							}
						},
						{
							type: 'formControl',
							logic: {
								label: 'Titolo Intervento',
								component: 'TextField',
								key: 'interventTitle',
							}
						},
					]
				}
			}
		];
	}

	/**
	 * Returns the send action to use
	 */
	protected async getSendAction(mode: 'POST' | 'PUT' | 'PATCH', toSave: ISxmpRepairsSettings): Promise<any> {
		const diff = !this.objFromBe ? true : ObjectUtils.objectDifference(toSave, this.objFromBe);
		if (diff)
			return RequestService.client('put', this.controllerUrl, {data: toSave});
	}

}

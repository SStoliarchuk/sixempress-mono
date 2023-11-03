import { AbstractEditor, TimeService, TopLevelEditorPart } from '@sixempress/main-fe-lib';
import Box from '@material-ui/core/Box';
import { FormControl, Validators } from "react-reactive-form";
import { MovementDirection, Movement, MovementDirectionLabel, MovementMedium, MovementMediumLabel } from "../Movement";
import { MovementController } from '../movement.controller';

export class MovementEditor extends AbstractEditor<Movement> {

	controller = new MovementController();

	// we dont need it as it's assigned the value of documentlocation
	requireDocumentLocationsFilter = false;
	requirePhysicalLocation = true;

	generateEditorSettings(val: Movement = {} as any): TopLevelEditorPart<Movement>[] {

		return [
			{
				type: 'formControl',
				logic: {
					component: 'DateTimePicker',
					label: 'Data movimento',
					key: 'date',
					control: new FormControl(val.date || TimeService.getCorrectMoment().unix(), Validators.required)
				}
			},
			{
				type: 'formControl',
				logic: {
					component: 'SelectField',
					key: 'direction',
					label: 'Tipo movimento',
					control: new FormControl(val.direction || MovementDirection.output , Validators.required),
					values: Object.values(MovementDirectionLabel).filter(i => typeof i === 'number').map(i => ({value: i, label: MovementDirectionLabel[i]})),
				}
			},
			{
				type: 'formControl',
				logic: {
					component: 'PriceField',
					key: 'priceAmount',
					label: 'Denaro',
					required: true,
				}
			},
			{
				type: 'formControl',
				logic: {
					component: 'SelectField',
					key: 'medium',
					label: 'Tipo',
					control: new FormControl(val.medium || MovementMedium.unspecified , Validators.required),
					values: Object.values(MovementMediumLabel).filter(i => typeof i === 'number').map(i => ({value: i, label: (
						<Box display='flex' alignItems='center'>
							{MovementController.getMediumIcon(i)}&nbsp;{MovementMediumLabel[i]}
						</Box>
					) as any})),
				}
			},
			{
				type: 'formControl',
				gridProp: {md: 12},
				logic: {
					component: 'TextArea',
					label: 'Descrizione',
					key: 'description',
					required: true,
				}
			},
		];
	}

	protected generateToSaveObjectByFormGroup(toSave: Movement) {
		toSave.requireAttributeToSee = toSave.requireAttributeToSee || null;
	}

}

import React from "react";
import { FieldsFactory } from "@sixempress/main-fe-lib";
import { CalendarEventType, IGenericEvent } from "../CalendarEvent";
import Button from "@material-ui/core/Button";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { AEMProps_INTERNAL, ReturningEvent } from "./create-event.dtd";

export function GenericEvent(p: AEMProps_INTERNAL) {

	const data = p.edit || {};

	const [title, setTitle] = React.useState<string>(data.title || "");
	const [desc, setDesc] = React.useState<string>(data.data && typeof data.data.data === 'string' ? data.data.data : "");

	const handleTitle = (e) => setTitle(e.target.value);
	const handleDesc = (e) => setDesc(e.target.value);
	const handleClose = (e) => p.onClose();
	const handleSubmit = (e) => {
		const toR: ReturningEvent<IGenericEvent> = {
			title,
			data: {
				type: CalendarEventType.generic
			}
		};
		
		if (desc) {
			toR.data.data = desc;
		}

		p.onSubmit(toR);
	}

	const canSave = p.canSave && Boolean(title);

	return (
		<>
			<DialogContent>
				<FieldsFactory.TextField
					label={""}
					placeholder={"Titolo"}
					value={title}
					margin={'dense'}
					fullWidth
					onChange={handleTitle}
					error={!title}
				/>
				<FieldsFactory.TextArea
					label={"Descrizione"}
					value={desc}
					fullWidth
					variant='outlined'
					onChange={handleDesc}
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose}>Annulla</Button>
				<Button onClick={handleSubmit} color='primary' variant='contained' disabled={!canSave}>Salva</Button>
			</DialogActions>
		</>
	);
}

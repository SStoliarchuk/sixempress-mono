import './raw-files.utils.css';
import {  ModalService } from "@sixempress/main-fe-lib";
import { AuthService } from '@sixempress/abac-frontend';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { AbstractControl } from "react-reactive-form";
import { RawFilesTables } from "./raw-files-tables";
import { RFTProps } from "./raw-files.dtd";
import Image from "@material-ui/icons/Image";

export function openSelectRawFiles(p: RFTProps) {
	ModalService.open(
		{content: RawFilesTables}, 
		p,
		{
			removePaper: true,
			maxWidth: 'lg',
			fullWidth: true,
		}
	)
}

export function RawFilesFormControl(fc: AbstractControl) {
	const val = (fc.value || []) as {name: string, url: string}[];
	const thumbs = val.length > 2 ? 3 : val.length;

	const onClick = () => {
		if (!AuthService.isAttributePresent(Attribute.viewRawFiles)) 
			return ModalService.open({title: 'Permessi necessari', content: 'Non hai i permessi per visualizzare i File e Documenti'});

		openSelectRawFiles({
			selectMode: true,
			onSelectConfirm: (files) => fc.setValue(files.map(f => ({name: f.name, url: f.url}))),
		});
	}

	return (
		<div className={'rf-field-img-cont l-' + thumbs} onClick={onClick}>
			{val[0]?.url
				? (<img src={val[0].url} alt={val[0].name}/>)
				: (<div><Image/></div>)
			}
		</div>
	)
}

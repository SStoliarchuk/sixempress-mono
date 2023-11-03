import { ApiKey, ApiKeyType, ApiKeyTypeLabel } from './ApiKey';
import { ApiKeyController } from './api-key.controller';
import { AbstractBasicDt, DataFormatterService, ICustomDtSettings } from '@sixempress/main-fe-lib';
import { Attribute } from '../../enums';

export class ApiKeysTable extends AbstractBasicDt<ApiKey> {

	controller = new ApiKeyController();

	protected getDtOptions(): ICustomDtSettings<ApiKey> {
		return {
			buttons: [
				{
					title: 'Aggiungi',
					attributes: { required: [Attribute.addApiKeys] },					
					onClick: () => this.openEditor()
				},
				{
					title: 'Modifica',
					attributes: { required: [Attribute.modifyApiKeys] },					
					select: {type: "single", enabled: (m) => m.type === ApiKeyType.manual},
					onClick: (event, dt) => this.openEditor(dt)
				},
				{
					title: 'Elimina',
					attributes: { required: [Attribute.deleteApiKeys] },
					props: {color: 'secondary'},
					select: {type: "single", enabled: (m) => m.type === ApiKeyType.manual},
					onClick: (e, dt) => this.sendDeleteRequest(dt)
				}
			],
			columns: [
				{
					title: 'Nome',
					data: 'name'
				},
				{
					title: 'Tipo',
					data: 'type',
					render: (n) => ApiKeyTypeLabel[n],
				},
				{
					title: 'N. Attributi',
					data: 'attributes',
					search: false,
					render: (n) => n.length
				},
				{
					title: "Chiave",
					data: "_key",
					search: false,
				},
				{
					title: "Scadenza",
					data: "expires",
					search: false,
					render: (n) => n === false ? "MAI" : DataFormatterService.formatUnixDate(n),
				}
			],
		};
	}
	
}

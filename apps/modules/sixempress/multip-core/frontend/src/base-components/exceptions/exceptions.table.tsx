import React from 'react';
import { AbstractBasicDt, ICustomDtSettings, DataFormatterService, ModalService, UiSettings } from '@sixempress/main-fe-lib';
import { ExceptionController } from './exception.controller';

export class ExceptionTable extends AbstractBasicDt<any> {
	
	controller = new ExceptionController();

	getDtOptions(): ICustomDtSettings<any> {
		return {
			buttons: [{
				title: 'Log',
				onClick: (e, dt) => {
					const id = this.getRowData(dt)._id;
					this.controller.getSingle(id).then(data => {
						console.log(data);
						try {console.log('ex', JSON.parse(data.ex))}
						catch (e) {}
	
						if (UiSettings.lessLg())
							ModalService.open(() => <code dangerouslySetInnerHTML={{ __html: DataFormatterService.objToHtml(data)}}/>);
					});
				}
			}],
			columns: [{
				title: 'Data',
				data: '_createdTimestamp',
				render: (data) => DataFormatterService.formatUnixDate(data)
			}, {
				title: 'Messaggio',
				data: 'ex', 
			}, {
				title: 'Stack',
				data: 'stack', 
			}]
		}
	}

}



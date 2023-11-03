import React from 'react';
import { AbstractBasicDt, ICustomDtSettings, DataFormatterService, ModalService, UiSettings } from '@sixempress/main-fe-lib';
import { ErrorReport } from "./ErrorReport";
import { ErrorReportController } from './error-report.controller';

export class ErrorReportTable extends AbstractBasicDt<ErrorReport> {
	
	controller = new ErrorReportController();

	getDtOptions(): ICustomDtSettings<ErrorReport> {
		return {
			buttons: [{
				title: 'Log',
				onClick: (e, dt) => {
					const id = this.getRowData(dt)._id;
					this.controller.getSingle(id).then(data => {
						console.log(data);
	
						if (UiSettings.lessLg())
							ModalService.open(() => <code dangerouslySetInnerHTML={{ __html: DataFormatterService.objToHtml(data)}}/>);
					});
				},
			// }, {
			// 	title: 'Elimina',
			// 	attributes: {required: [false]},
			// 	className: 'dt-btn bg-error',
			// 	select: {type: 'single'},
			// 	onClick: (e, dt) => this.sendDeleteRequest(dt)
			}],
			columns: [{
				title: 'Data',
				data: '_date',
				render: (data) => DataFormatterService.formatUnixDate(data)
			}, {
				title: 'Slug',
				data: '_systemSlug'
			}, {
				title: 'Descrizione',
				data: 'userDescription'
			}, {
				title: 'Message',
				data: 'exception.message',
				render: (a, m) => m.exception.message,
			}, {
				title: 'Stack',
				data: 'exception.stack',
				render: (a, m) => JSON.stringify(m.exception.stack),
			}]
		};
	}

}

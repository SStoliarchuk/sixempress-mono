import React from 'react';
import { AsyncModelTableSelect } from "../async-model-table-select";
import { IAsyncModelSelectProps } from "../dtd";
import { BePaths as LibBePaths } from '../../../utils/enums/bepaths.enum';
import { GenericController } from '../../../services/controllers/generic-controller';
import { Observable, Subject } from 'rxjs';
import { Button } from '@material-ui/core';

describe("AsyncModelTableSelect async-model-table-select.tsx", () => {

	it ("generates the right columns", () => {

		// TODO write this test

		// const asyncCustomerConf: IAsyncModelSelectProps<any> = {
		// 	bePath: LibBePaths.customers,
		// 	editor: UserEditor,
		// 	onEditorClose: jest.fn(),
		// 	onEditorOpen: jest.fn(),
		// 	requestOptions: jest.fn().mockImplementation((p) => ({params: p})),
		// 	getFilters: {},
		// 	choseFn: () => jest.fn(), 
		// 	infoConf: { columns: [{
		// 		title: 'id.',
		// 		data: '_id',
		// 	}, {
		// 		title: 'Nome',
		// 		data: 'name',
		// 	}, {
		// 		title: 'username',
		// 		data: 'username'
		// 	}] }
		// };

		// GenericController.getMulti = () => new Observable(o => o.next({items: [
		// 	{_id: '1', name: 'a', username: 'b'},
		// 	{_id: '1', name: 'a', username: 'b'},
		// ]})) as any;
		// let comp: ShallowWrapper;
		// comp = shallow(<AsyncModelTableSelect {...asyncCustomerConf} />);
		// expect(asyncCustomerConf.requestOptions).toHaveBeenCalledTimes(1);

		// // test modal functions

		// const modalControls = {result: new Subject()};
		// ModalService.open = jest.fn().mockReturnValue(modalControls);
		// comp.find(Button).simulate('click');
		// expect(asyncCustomerConf.onEditorOpen).toHaveBeenCalledTimes(1);
		// expect(ModalService.open).toHaveBeenCalledTimes(1);
		// expect(ModalService.open).toHaveBeenCalledWith(
		// 	asyncCustomerConf.editor,
		// 	expect.anything(),
		// );
		// expect(asyncCustomerConf.onEditorClose).toHaveBeenCalledTimes(0);
		// modalControls.result.next();
		// expect(asyncCustomerConf.onEditorClose).toHaveBeenCalledTimes(1);
		// // console.log(comp.debug());


		// // throws error on no column given
		// const A: any = AsyncModelTableSelect;
		// expect(() => shallow(<A infoConf={{columns: []}}/>)).toThrow();

	});

});

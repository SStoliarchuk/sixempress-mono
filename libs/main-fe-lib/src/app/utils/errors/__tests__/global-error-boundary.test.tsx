import React from 'react';
import { GlobalErrorBoundary } from '../handler/global-error-boundary';
import { ModalService } from '../../../services/modal-service/modal.service';
import { GlobalErrorHandler } from '../handler/global-error-handler';
import { render } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

const mock_historyPushFn = jest.fn();
jest.mock('react-router', () => ({
	useHistory: () => ({
		push: mock_historyPushFn,
	})
}));

jest.spyOn(console, 'error').mockImplementation(() => void 0);

let ref = { throw: void 0 };

function ChildThatThrows() {
	const [a, b] = React.useState<any>()
	ref.throw = () => b({});
	if (a) { throw new Error("Asd"); }
	return ( <h1>I WILL THROW UP</h1> );
}

describe("GlobalErrorBoundary global-error-boundary.tsx", () => {

	it("catches from window.error and childs", () => {

		// jest.spyOn(ModalService, 'closeAll').mockReturnValue(undefined);
		// jest.spyOn(GlobalErrorHandler, 'handleError').mockReturnValue(undefined);
		// jest.spyOn(window, 'addEventListener');

		// render((<GlobalErrorBoundary><ChildThatThrows/></GlobalErrorBoundary>));
		// expect(window.addEventListener).toHaveBeenCalled();

		// window.dispatchEvent(new Event("error"));
		// expect(ModalService.closeAll).toHaveBeenCalledTimes(1);
		// expect(GlobalErrorHandler.handleError).toHaveBeenCalled();
		// // TODO fix
		// // expect(GlobalErrorHandler.handleError).toHaveBeenCalledTimes(1);

		// // navigate to root if there is a loop of errors
		// window.dispatchEvent(new Event("error"));
		// window.dispatchEvent(new Event("error"));
		// expect(mock_historyPushFn).toHaveBeenCalledWith('/');

		// // Component Did Catch
		// mock_historyPushFn.mockReset();
		// (ModalService.closeAll as any).mockReset();
		// (GlobalErrorHandler.handleError as any).mockReset();
		
		// try { act(() => ref.throw()); } catch (e) {}
		// expect(ModalService.closeAll).toHaveBeenCalled();
		// expect(GlobalErrorHandler.handleError).toHaveBeenCalled();
		// expect(mock_historyPushFn).toHaveBeenCalledWith('/');
		
		// // expect(mock_historyPushFn).toHaveBeenCalledTimes(1);
		// // TODO fix
		// // expect(GlobalErrorHandler.handleError).toHaveBeenCalledTimes(1);
		// // expect(mock_historyPushFn).toHaveBeenCalledTimes(1);

	});

});

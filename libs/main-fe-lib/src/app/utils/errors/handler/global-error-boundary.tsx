import React from 'react';
import { GlobalErrorHandler } from './global-error-handler';

/**
 * This is the internal class used to receive the history prop for component navigation on unmount error
 */
export class GlobalErrorBoundary extends React.Component<{children?: any}> {

	private static onError(e: any) {
		GlobalErrorHandler.handleError(e ? e.error || e : e);

		// prevent default error firing
		return true;
	}

	static getDerivedStateFromError() {
		return {};
	}

	componentDidCatch(e: any) {
		// ModalService.closeAll();
		GlobalErrorBoundary.onError(e);
	}

	render() { 
		return this.props.children;
	}

}


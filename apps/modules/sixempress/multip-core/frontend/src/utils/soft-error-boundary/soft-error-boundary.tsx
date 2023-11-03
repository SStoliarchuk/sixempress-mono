import React from 'react';

interface SEBState {
	hasError: false | any,
}

export class SoftErrorBoundary extends React.Component<{children?: any}, SEBState> {

	state: SEBState = {
		hasError: false,
	};

  static getDerivedStateFromError(error): SEBState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    // logErrorToMyService(error, errorInfo);
		console.log(error);

		this.setState({ hasError: error });
  }

  render() {

		console.log(this.state);
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children; 
  }
}
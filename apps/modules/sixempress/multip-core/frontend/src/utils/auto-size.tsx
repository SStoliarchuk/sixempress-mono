import React from 'react';
import { findDOMNode } from 'react-dom';
import { Subscription, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

export class AutoSize extends React.Component<{
	children: (data: {width: number, height: number}) => any,
}> {

	state: { 
		width?: number,
		height?: number,
	} = {};

	private parent: HTMLElement;
	private resizeEmitter = new Subject<void>();
	private sub: Subscription;

	
	componentDidMount() {
		// get parent
		this.parent = findDOMNode(this as any).parentNode as any;
		// start with initial value
		this.resize();
		
		// subscribe to events
		this.sub = this.resizeEmitter.pipe(debounceTime(300)).subscribe(() => this.resize());
		window.addEventListener('resize', this.onWindowResize);
	}

	// remove events
	componentWillUnmount() {
		if (this.sub) { this.sub.unsubscribe(); }
		window.removeEventListener('resize', this.onWindowResize);
	}

	private onWindowResize = () => {
		this.resizeEmitter.next();
	}
	
	private resize() {
		this.setState({ width: this.parent.clientWidth, height: this.parent.clientHeight });
	}

	render() {
		return (this.props.children({width: this.state.width || 0, height: this.state.height || 0}));
	}

}

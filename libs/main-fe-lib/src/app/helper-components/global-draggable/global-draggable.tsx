import React from 'react';
import { disableScroll, enableScroll } from '@sixempress/utilities';

interface GDProps {
	/**
	 * if true it adds the scroll of the window to the top/left
	 * adds the scroll only if the left/top params are given
	 */
	addScroll?: boolean;
	children?: any;
	left?: number;
	top?: number;
}

export class GlobalDraggable extends React.Component<GDProps> {


	private startingStyle: any = {position: "absolute", zIndex: 10};

	private container = React.createRef<any>();

	private pos1: number = 0;
	private pos2: number = 0;
	private pos3: number = 0;
	private pos4: number = 0;


	constructor(p: GDProps) {
		super(p);
		if (p.left) 
			this.startingStyle.left = p.left;
		
		if (p.top) 
			this.startingStyle.top = p.top;

		if (p.addScroll) {
			if (typeof this.startingStyle.left !== 'undefined' && window.scrollX)
				this.startingStyle.left += window.scrollX;

			if (typeof this.startingStyle.top !== 'undefined' && window.scrollY)
				this.startingStyle.top += window.scrollY;
		}

	}


	private handleMouseAndTouchDown = (e) => {
		// in case it is closed but the event is still fired
		if (!this.container.current)
			return;
	
		disableScroll();
		
		e = e || window.event;
		e.preventDefault();

		// get the mouse cursor position at startup:
		this.pos3 = e.clientX;
		this.pos4 = e.clientY;

		document.addEventListener('mouseup', this.closeDragElement);
		document.addEventListener('mousemove', this.elementDrag);

		document.addEventListener('touchmove', this.touchHandler, true);
		document.addEventListener('touchend', this.touchHandler, true);
	}

	private elementDrag = (e) => {
		// in case it is closed but the event is still fired
		if (!this.container.current)
			return;

		e = e || window.event;
		e.preventDefault();

		// calculate the new cursor position:
		this.pos1 = this.pos3 - e.clientX;
		this.pos2 = this.pos4 - e.clientY;
		this.pos3 = e.clientX;
		this.pos4 = e.clientY;

		// set the element's new position:
		this.container.current.style.top = (this.container.current.offsetTop - this.pos2) + "px";
		this.container.current.style.left = (this.container.current.offsetLeft - this.pos1) + "px";
	}

	private closeDragElement = () => {
		document.removeEventListener('mouseup', this.closeDragElement);
		document.removeEventListener('mousemove', this.elementDrag);

		document.removeEventListener('touchmove', this.touchHandler, true);
		document.removeEventListener('touchend', this.touchHandler, true);

		enableScroll();
	}


	/**
	 * Transforms the touch events into mouse events
	 */
	private touchHandler(event) {
		const touches = event.changedTouches;
		const first = touches[0];
		let type = "";

		switch (event.type) {
			case "touchstart": type = "mousedown"; break;
			case "touchmove":  type = "mousemove"; break;        
			case "touchend":   type = "mouseup";   break;
			default: return;
		}

		const simulatedEvent = document.createEvent("MouseEvent");

		simulatedEvent.initMouseEvent(
			type, true, true, window, 1, first.screenX, first.screenY, 
			first.clientX, first.clientY, false, false, false, false, 0/*left*/, null
		);

		first.target.dispatchEvent(simulatedEvent);
	}

	render() {
		return (
			<div 
				ref={this.container}
				style={this.startingStyle} 
				onMouseDown={this.handleMouseAndTouchDown} 
				onTouchStart={this.handleMouseAndTouchDown}
			>
				{this.props.children}
			</div>
		);
	}


}
import React from 'react';
import { Omit } from '@material-ui/core';

export declare type RegisterTutorialOverlayItem = {type: "big" | "pop"} & Omit<TutorialItem, 'el'>;

export declare type TutorialOverlayItem = {type: "big" | "pop"} & TutorialItem;

export interface TutorialItemSelector {
	/**
	 * html element
	 * @priority 1
	 */
	el?: Element;
	/**
	 * The [data-testid=""] for the element
	 * @priority 2
	 */
	testid?: string;
	/**
	 * Uses query selector to find the item
	 * @priority 3
	 */
	querySelector?: string;
	/**
	 * Searches the exact text with xpath
	 * @priority 4
	 */
	textExact?: string;
	/**
	 * Searches the element that contains this text with xpath
	 * @priority 5
	 */
	textContains?: string;
	/**
	 * crude xpath to use
	 * @priority 6
	 */
	xPath?: string;
	/**
	 * contains the text but the regex version
	 * it manually goes trhough all the items innerHTML
	 * 
	 * you can also pass a way to saerch only in a given element instead of all the document.body
	 * @priority 7
	 */
	textRegex?: RegExp | {searchIn: TutorialItemSelector, regex: RegExp};
	/**
	 * Manually return the element
	 * @priority 8
	 */
	fn?: () => Element[];
}

export interface TutorialItem extends TutorialItemSelector {
	/**
	 * Element to use as anchor
	 */
	el: Element;
	/**
	 * Data to show for the tutorial
	 */
	text?: string | JSX.Element | ((matchingElement: Element) => string | JSX.Element);
}

export interface TSState {
	smallPop: Array<TutorialItem>;
	bigCircle: Array<TutorialItem>;
	tutorialOverlayItems: Array<TutorialOverlayItem>;
}


export declare type StateChangeRequest = Partial<TSState>;


export function ElOutline(p: {el: Element}) {
	const rect = p.el.getBoundingClientRect();

	const borderSize = 4;
	const style: React.CSSProperties = {
		top: rect.top + window.scrollY - borderSize + "px",
		left: rect.left + window.scrollX - borderSize + "px",
		width: rect.width + "px",
		height: rect.height + "px",
		border: borderSize + "px solid rgba(255, 255, 255, 0.3)",
	};

	return (
		<div className='tutorial-outline' style={style}></div>
	);
}

export function polygon(targets: TutorialItem[]): string {
	
	// dont add the same item twice as that will cause to cancel the rect overlay
	//
	// TODO maybe implement some more resistant logic to not cross the same area twice cancelling itself
	// instead of this simple check. but it will do for now
	const rects: ClientRect[] = [];
	const added: Element[] = [];
	for (const t of targets) {
		if (added.includes(t.el)) {
			continue;
		}
		added.push(t.el);
		rects.push(t.el.getBoundingClientRect());
	}

	//
	//
	// 				1----------------2
	//        |                |
	//        |  7---6         |
	//        |  |   |         |
	// 				|  8--5/9        |
	//        |      |         |
	//        |      |         |
	// 			 11----4/10--------3
	//
	//

	// 1 2 3
	let str = 'polygon(0% 0%, 100% 0%, 100% 100%,';

	// add all the rects
	for (const rect of rects) {

		const top = window.scrollY + rect.top;
		const left = window.scrollX + rect.left;

		str += (left + rect.width) + "px 100%,\
		" + (left + rect.width) + "px " + (top + rect.height) + "px ,\
		" + (left + rect.width) + "px " + top + "px ,\
		" + (left) + "px " + (top) + "px ,\
		" + (left) + "px " + (top + rect.height) + "px ,\
		" + (left + rect.width) + "px " + (top + rect.height) + "px ,\
		" + (left + rect.width) + "px 100%,";
	}

	// 11 1
	str += '0% 100%, 0% 0%)';

	return str;
}

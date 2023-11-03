import "./tutorial.service.css";
import React from 'react';
import { BigCircle } from "./items/big-circle";
import { SmallPops } from "./items/small-pops";
import { RegisterTutorialOverlayItem, TutorialItem, TutorialOverlayItem, TSState, TutorialItemSelector } from "./utils";
import { OverlayItem } from "./items/overlay-item";
import { disableScroll, enableScroll } from "@sixempress/utilities";

export class TutorialService extends React.Component<{}, TSState> {


	/**
	 * If the tutorial is active
	 */
	public static isTutorialOverlayOpen: boolean = false;

	/**
	 * The instance of the service present in jsx, used to send the jsx updates
	 */
	private static currentTutorialServiceInstance: TutorialService;

	/**
	 * we set an interval to update the interest points regardless of ui updates
	 * just to ensure that if the first pain after the ui update was a little off
	 * it will get corrected in the next update
	 */
	private static updateInterval: NodeJS.Timeout;

	/**
	 * All the items that the user has registered to show
	 */
	private static registeredTutorialItems: {[registerId: string]: RegisterTutorialOverlayItem[]} = {};

	/**
	 * Opens a big circle surrounding the item given
	 * @param el a querySelector or complex selector
	 */
	public static open(el: string | TutorialItemSelector, text: TutorialItem['text'], type: "big" | "pop" = 'big') {
		disableScroll();
		const es = TutorialService.getElByPassedParams(typeof el === 'string' ? {querySelector: el} : el);
		
		if (!es[0])
			return enableScroll();

		window.addEventListener('click', TutorialService.currentTutorialServiceInstance.clickOnClose);

		if (type === 'big')
			TutorialService.currentTutorialServiceInstance.setState({bigCircle: [{el: es[0], text}]}); 
		else 
			TutorialService.currentTutorialServiceInstance.setState({smallPop: [{el: es[0], text}]});
	}

	/**
	 * Saves the tutorial for later to be opened automatically or manually with the overlay
	 */
	public static register(items: {[registerId: string]: RegisterTutorialOverlayItem | RegisterTutorialOverlayItem[]}) {
		for (const id in items) {
			if (!TutorialService.registeredTutorialItems[id]) {
				TutorialService.registeredTutorialItems[id] = [];
			}
			if (Array.isArray(items[id])) {
				TutorialService.registeredTutorialItems[id].push(...items[id] as RegisterTutorialOverlayItem[]);
			} else {
				TutorialService.registeredTutorialItems[id].push(items[id] as RegisterTutorialOverlayItem);
			}
		}
	}

	/**
	 * Shows an overlay with all the registered tutorial items
	 * @param isOpen The new state of the overlay
	 */
	public static toggleTutorialOverlay(isOpen: boolean) {
		// return as not to double the listeners
		if (TutorialService.isTutorialOverlayOpen === isOpen) 
			return;
		
		TutorialService.isTutorialOverlayOpen = isOpen;
		
		if (isOpen) {
			// TODO use slower interval with the other triggers
			// or just use a fast interval ?
			//
			// TODO leave this faast interval and then add a cache that gets deleted on the actions registered below
			// so that you have nice performance
			this.updateInterval = setInterval(TutorialService.update, 200);
			
			// ModalService.onModalsChange.registerAction(TutorialService.updateSlowSystemChange);
			// RouterService.onPageChange.registerAction(TutorialService.updateSlowSystemChange);
			
			// window.addEventListener('resize', TutorialService.updateQuickSystemChange);
			// window.addEventListener("scroll", TutorialService.updateQuickSystemChange);
			// window.addEventListener("wheel", TutorialService.updateQuickSystemChange);
			
			// window.addEventListener('popstate', TutorialService.updateSlowSystemChange);
			// window.addEventListener("mouseup", TutorialService.updateSlowSystemChange);
			// window.addEventListener("touchend", TutorialService.updateSlowSystemChange);

			TutorialService.update();
		}
		else {
			clearInterval(this.updateInterval);

			// ModalService.onModalsChange.removeAction(TutorialService.updateSlowSystemChange);
			// RouterService.onPageChange.removeAction(TutorialService.updateSlowSystemChange);
			
			// window.removeEventListener('resize', TutorialService.updateQuickSystemChange);
			// window.removeEventListener("scroll", TutorialService.updateQuickSystemChange);
			// window.removeEventListener("wheel", TutorialService.updateQuickSystemChange);
			
			// window.removeEventListener('popstate', TutorialService.updateSlowSystemChange);
			// window.removeEventListener("mouseup", TutorialService.updateSlowSystemChange);
			// window.removeEventListener("touchend", TutorialService.updateSlowSystemChange);

			TutorialService.currentTutorialServiceInstance.setState({tutorialOverlayItems: null});
		}
	}

	// private static updateQuickSystemChange = SmallUtils.debounce(
	// 	UiSettings.contentTheme.transitions.duration.enteringScreen, 
	// 	TutorialService.update
	// );

	// private static updateSlowSystemChange = SmallUtils.debounce(
	// 	UiSettings.contentTheme.transitions.duration.enteringScreen * 3, 
	// 	TutorialService.update
	// );
	

	/**
	 * Checks which registered items are present in the dom, and passes them to the jsx
	 */
	private static update() {
			
		if (!TutorialService.isTutorialOverlayOpen) 
			return;

		const itemsToShow: TutorialOverlayItem[] = [];
		for (const k in TutorialService.registeredTutorialItems) {
			const registered = TutorialService.registeredTutorialItems[k];
			for (const r of registered) {
				const es = TutorialService.getElByPassedParams(r);
				for (const e of es) { 
					itemsToShow.push({el: e, text: r.text, type: r.type}); 
				}
			}
		}

		TutorialService.currentTutorialServiceInstance.setState({tutorialOverlayItems: itemsToShow});
	}
	
	/**
	 * Returns the html elemetns based on given selectors
	 */
	private static getElByPassedParams(item: TutorialItemSelector): Element[] {
		if (item.el) {
			return [item.el];
		} 
		else if (item.testid) {
			return TutorialService.returnFilteredSelected('[data-testid="' + item.testid + '"]');
		}
		else if (item.querySelector) {
			return TutorialService.returnFilteredSelected(item.querySelector);
		}
		else if (item.textExact) {
			return TutorialService.getElByXpath("//*[text()='" + item.textExact + "']");
		}
		else if (item.textContains) {
			return TutorialService.getElByXpath("//*[contains(text(),'" + item.textContains + "')]");
		}
		else if (item.xPath) {
			return TutorialService.getElByXpath(item.xPath);
		}
		else if (item.textRegex) {
			const parents = item.textRegex instanceof RegExp ? [document.body as Element] : TutorialService.getElByPassedParams(item.textRegex.searchIn);
			const text = item.textRegex instanceof RegExp ? item.textRegex : item.textRegex.regex;
			
			const toR: Element[] = [];
			for (const p of parents) {
				const all = p.getElementsByTagName("*");
				for (let i = 0; i < all.length; i++) {
					if (all[i].innerHTML.match(text) && this.isNodeElementVisible(all[i])) {
						toR.push(all[i]);
					}
				}
			}
			return toR;
		}
		else if (item.fn) {
			return item.fn();
		}
		else {
			return [];
		}
	}

	/**
	 * Queries the html document for the xpath target
	 */
	private static getElByXpath(xpath: string): Element[] {
		const result = document.evaluate(xpath, document.body, null, XPathResult.ANY_TYPE, null);
		const nodes: Element[] = [];
		let node: Element = result.iterateNext() as any;
		while (node) {
			if (TutorialService.isNodeElementVisible(node)) {
				nodes.push(node);
			}
			node = result.iterateNext() as any;
		}
		return nodes;
	}

	/**
	 * Returns only the visible elements of a given selector
	 */
	private static returnFilteredSelected(selector: string): Element[] {
		const toR: Element[] = [];
		document.querySelectorAll(selector).forEach(el => {
			if (TutorialService.isNodeElementVisible(el)) { toR.push(el); }
		});
		return toR;
	}

	/**
	 * Ensures that the element is visible and present in the viewport
	 */
	private static isNodeElementVisible(el: Element): boolean {
		const rect = el.getBoundingClientRect();

		if (
			// this method is used to hide material ui elements
			(rect.bottom + rect.height + rect.left + rect.right + rect.top + rect.width) !== 0
			// TODO add check for display/visibility
		) {
			return true;
		}

		return false;
	}

	/**
	 * Ensure singleton
	 */
	constructor(p) { 
		super(p);
		TutorialService.currentTutorialServiceInstance = this;
	}

	private clickOnClose = () => {
		this.setState({bigCircle: null, smallPop: null});
		enableScroll();
		window.removeEventListener('click', this.clickOnClose);
	}

	state: TSState = {
		smallPop: null,
		bigCircle: null,
		tutorialOverlayItems: null,
	};

	private onClickOverlayTutItem = (idx: number) => {
		const item = this.state.tutorialOverlayItems[idx];
		TutorialService.open({el: item.el}, item.text, 'pop');
	}

	render() {

		if (this.state.smallPop && this.state.smallPop.length !== 0) {
			return (
				<SmallPops arr={this.state.smallPop} />
			);
		}

		if (this.state.bigCircle && this.state.bigCircle.length !== 0) {
			return (
				<BigCircle data={this.state.bigCircle} onClose={this.clickOnClose}/>
			);
		}

		if (this.state.tutorialOverlayItems && this.state.tutorialOverlayItems.length !== 0) {
			return (
				<OverlayItem arr={this.state.tutorialOverlayItems} onClick={this.onClickOverlayTutItem}/>
			);
		}

		return (null); 

	}

}

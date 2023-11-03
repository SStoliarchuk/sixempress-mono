import { RenderResult } from "@testing-library/react";
import { TargetElement } from "@testing-library/user-event";
import { Attribute } from "app/utils/enums/default-enums.enum";
import { Renderer } from "react-dom";
import { BusinessLocation } from "../app/services/context-service/context.dtd";
import { IRequestResponse } from "../app/services/dtd";

export {};


declare global {
	/**
	 * Six Empress Test Tools
	 * the syntax is like Cypress to keep everything similar
	 */
	var SETT: {
		
		Commands: {
			add<A extends keyof typeof tt>(name: A, fn: (typeof tt)[A]): void;
		}

	}

	/**
	 * Inspired by cypress
	 */
	var tc: TestChain;

	
	/**
	 * Test Tools
	 */
	var tt: TestTools

}


export interface TestChain {

	/**
	 * Wraps the given component in some utils like disabling animations
	 */
	render(e: JSX.Element, skipCleanup?: boolean): RenderResult

	/**
	 * Returns a material ui field by it's ui label
	 */
	getMuiField(label: string | RegExp, container?: RenderResult): TestChainedItem;

	getAllMuiField(label: string | RegExp, container?: RenderResult): TestChainedItem[];

	/**
	 * Waits for given ms
	 */
	wait(ms: number): Promise<void>;
	
	/**
	 * same as .debug() but better
	 */
	debug(c?: RenderResult | TestChainedItem | Node): void;

	/**
	 * closes all popovers/dialogs and click on the body
	 */
	focusBody(): void,

	/**
	 * Wraps :]
	 */
	wrap(c?: TestChainedItem | Element | HTMLElement | Node): TestChainedItem,

}

export interface TestChainedItem {

	element: Element;

	muiSelect(item: number | string | RegExp): TestChainedItem;

	muiSelectMulti(items: (number | string | RegExp)[]): TestChainedItem;

	/**
	 * returns the react information about a node
	 * @param traverseUp how many nodes to go up to get root element rendered by the function/component\
	 * example: <div><h1/><div>\
	 * so if this element is h1, you have to pass 1 here, as the div is the root element
	 */
	getReactInstance(traverseUp?: number): ReactNodeInstance | null

	/**
	 * Allows you to simulate a chose amts list
	 * @param model the object to returns as the chosed model
	 */
	choseAmts(model: object): TestChainedItem;

	/**
	 * same as .debug() but better
	 */
	debug(): TestChainedItem;

	/**
	 * Clicks an elemnt if it's not disabled
	 */
	click(): TestChainedItem;

	/**
	 * Removes the data from a field
	 */
	clear(): TestChainedItem;

	/**
	 * Types into a field
	 */
	type(text: string | number | boolean, opts?: {clear?: boolean}): TestChainedItem;

}

export interface TestTools {

	/**
	 * await tt.wait(200) => wait for 200 ms
	 * @param ms ms to wait
	 */
	wait(ms: time): Promise<void>;

	/**
	 * simulates a usb barcode scan
	 */
	scanBarcode(text: string, clientApiResponseBody?: any): void;

	/**
	 * Doing setState() withouth mounting a component trhows a warning
	 * this function overiddes setState() to not throw
	 */
	setStateOverride(c: React.Component<any, any, any>): void;

	/**
	 * Allows to open the jsx in chrome to view it's graphical state
	 * useful for debugging
	 * 
	 * @param c the wrapper to show
	 * @param newWindow wheter to use an old opened window or a new one
	 */
	openInBrowser(c: RenderResult | Node, newWindow?: boolean): void,

	/**
	 * By default global.fetch is a mock function, here you can specify what it should returns
	 * @param body is the body to returns, it will be returned as given
	 * @param respone allows you to override/add fields in the response object
	 */
	setFetchResponse(body: any, response?: Partial<Response>): void;
	
	/**
	 * overrides clientapi.request to return the given body, useful to not have to make async test for setFetchResponse
	 */
	setClientApiResponse(body: any, obj?: IRequestResponse): void;

	/**
	 * Returns the slug of the database to use for the tests
	 */
	getSlug(): string;

	/**
	 * Sets the configuration of the ContextService
	 */
	setupContext(): void,

	/**
	 * Sets the configuration of AuthService
	 * @param sett.userAtt the attributes that the user has available
	 */
	setupAuth(sett?: {userAtt: Attribute[]}): void,
	
	/**
	 * Sets the configurations of the locations available for the user
	 * @param locations the array of all the locations available for the user to see
	 * @param chosenIdx if passed, it will set it as the default location, if the idx exists
	 */
	setupLocations(locations: BusinessLocation[], chosenIdx?: number): void,

}

export interface ReactNodeInstance {

	/**
	 * Returns the component associated with the node wrapped
	 */
	getReactComponent(): React.Component | null

	/**
	 * Returns the props of the node
	 */
	getProps(): any;

	fiber: ReactFiber
}

export interface ReactFiber {
	key: string,
	type: Function & {render: Function},
	stateNode: any,
	// pendingProps: any;
	memoizedProps: any;
}
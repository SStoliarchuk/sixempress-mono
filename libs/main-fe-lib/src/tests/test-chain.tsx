import React from 'react';
import { cleanup, fireEvent, prettyDOM, render, RenderResult, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFiber, TestChain, TestChainedItem, TestTools } from './globals';
import { ThemeProvider, createMuiTheme } from '@material-ui/core';
import CssBaseline from '@material-ui/core/CssBaseline';
import { AmtsFieldProps } from '../app/helper-components/fields/dtd';

const theme = createMuiTheme({
	transitions: {
		// So we have `transition: none;` everywhere
		create: () => 'none',
		duration: { shortest: 0, shorter: 0, short: 0, standard: 0, complex: 0, enteringScreen: 0, leavingScreen: 0, },
	},
	// disabling portal for easier testing for menus/dialogs
	props: {
		MuiPopover: {
			disablePortal: true,
		}
	},
});

((global as any).tc as TestChain) = {
	
	wait(ms: number) {
		return new Promise<void>((r, j) => setTimeout(() => r(), ms));
	},

	render(e: JSX.Element, skipCleanup?: boolean) {
		if (skipCleanup !== true) { cleanup(); }

		return render((
			<ThemeProvider theme={theme}>
				<CssBaseline/>
				{e}
			</ThemeProvider>
		));
	},

	wrap(c: TestChainedItem | Element | HTMLElement | Node) {
		if (c instanceof TestChained) {
			return c
		} else {
			return new TestChained(c as Element | HTMLElement | Node);
		}
	},

	debug(c?: RenderResult | TestChainedItem | Node) {
		const args: any = [Infinity, {indent: 3}];

		if (!c) {
			screen.debug(undefined, ...args);
		}
		else if ((c instanceof TestChained)) {
			console.log(prettyDOM(c.element as Element, ...args));
		}
		else if ((c as RenderResult).debug) {
			(c as RenderResult).debug(undefined, ...args);
		} 
		else {
			console.log(prettyDOM(c as Element, ...args));
		}
	},

	focusBody() {
		for (const p of screen.queryAllByRole('presentation')) {
			tc.wrap(p.firstChild).click();
		}
		tc.wrap(document.body).click();
	},

	getMuiField(text: string | RegExp, container: RenderResult = screen as any) {
		const all = this.getAllMuiField(text, container);

		if (all.length !== 1) {
			throw new Error ("Multiple Mui Field found: " + text);
		}

		return all[0];
	},

	getAllMuiField(text: string | RegExp, container: RenderResult = screen as any) {
		// in case the field is outlined
		// mui creates two labels text
		// one a label outside the input, and another inside the fieldset/legen/span
		// so here we ignore the second inside the fieldset
		const labelNode = container.getAllByText(text, {selector: "*:not(legend) > span, label"});

		const filtered = labelNode.map((node: Node) => {

			const check = within(node.parentElement).queryByRole("checkbox", {hidden: true});
			if (check) {
				return tc.wrap(check);
			}
	
			const radio = within(node.parentElement).queryByRole("radio", {hidden: true})
			if (radio) {
				return tc.wrap(radio);
			}
	
			// mui select
			if ((node.nextSibling?.childNodes[1] as Element)?.tagName.toLowerCase() === 'input') {
				return tc.wrap(node.nextSibling.childNodes[1]);
			} 
			
			// text field
			const tagName = (node.nextSibling?.childNodes[0] as Element)?.tagName.toLowerCase();
			if (tagName === 'input' || tagName === 'textarea') {
				return tc.wrap(node.nextSibling.childNodes[0]);
			}
		}).filter(c => Boolean(c));

		if (filtered.length === 0) {
			throw new Error ("Mui Field not found: " + text);
		}

		return filtered;
	},
	
	
}


class TestChained implements TestChainedItem {

	public element: Element;

	constructor(element: HTMLElement | Element | Node) {
		if (!element) { throw new Error("No element to wrap"); }
		this.element = element as any;
	}

	public debug = () => {
		tc.debug(this)

		return this;
	}

	public clear = () => {
		userEvent.clear(this.element);

		return this;
	};

	public click = () => {
		expect(this.element).not.toBeDisabled();
		userEvent.click(this.element);
		
		return this;
	};

	public type = (text: number | string | boolean, opts: {clear?: boolean} = {}) => {
		expect(this.element).not.toBeDisabled();
		if (opts.clear) {  this.clear(); }
		userEvent.type(this.element, text.toString());
		fireEvent.blur(this.element);

		return this;
	};

	public choseAmts = (model: object) => {
		const props: AmtsFieldProps<any> = this.getReactInstance(11).getProps();
		props.amtsInput.choseFn(model);
		
		return this;
	}

	public getReactInstance = (traverseUp?: number) => {
		const fiber = this.getReactFiber(traverseUp);
		if (!fiber) { return null; }

		return {
			getReactComponent: () => {
				return fiber.stateNode;
			},
			getProps: () => {
				return fiber.memoizedProps
			},
			fiber: fiber,
		}
	}

	public muiSelectMulti = (items: (number | string | RegExp)[]) => {
		this.executeMuiSelect(items, false);

		return this;
	}

	public muiSelect = (item: number | string | RegExp) => {
		this.executeMuiSelect([item], false);

		return this;
	}

	private getReactFiber(traverseUp: number = 0): ReactFiber | null {
		const key = Object.keys(this.element).find(k => k.startsWith("__reactInternalInstance$"));
		
		const domFiber = this.element[key];
		if (domFiber == null) {
			return null;
		}

		const GetCompFiber = fiber => {
			let parentFiber = fiber.return;
			while (typeof parentFiber.type === "string") {
				parentFiber = parentFiber.return;
			}
			return parentFiber;
		};

		let compFiber = GetCompFiber(domFiber);
		for (let i = 0; i < traverseUp; i++) {
			compFiber = GetCompFiber(compFiber);
		}
		return compFiber;
	}

	private executeMuiSelect(items: (number | string | RegExp)[], multiple: boolean) {
	
		// open the list
		const parent = within(this.element.parentElement);
		tc.wrap(parent.getByRole("button", {hidden: true})).click();
		const relativeList = parent.getByRole("listbox", {hidden: true});
	
		// selec item
		for (const i of items) {
			if (typeof i === 'number') {
				tc.wrap(relativeList.children[i]).click();
			} else {
				tc.wrap(within(relativeList).getByText(i)).click();
			}
		}
		
		// close the menu
		if (multiple) {
			tc.focusBody();
		}
	}
	

}

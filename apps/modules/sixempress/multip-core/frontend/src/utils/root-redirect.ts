import { Component } from 'react';
import { RouterService } from '@sixempress/main-fe-lib';
import { AuthService } from '@sixempress/abac-frontend';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';

export class RootRedirect extends Component<{history: any}> {

	constructor(props) {
		super(props);
		this.redirect();
	}

	private redirect() {
		
		let toGo: string;

		// TODO instead of manually checking.
		// check in the navBar voices array the first voice available
		// and use that link
		if (AuthService.isAttributePresent(Attribute.viewDashboard)) {
			toGo = '/dashboard';
		}
		else if (AuthService.isAttributePresent(Attribute.addSales)) {
			toGo = '/saledesk'; 
		}
		else if (AuthService.isAttributePresent(Attribute.viewCustomers)) {
			toGo = '/customers'; 
		}
		else if (AuthService.isAttributePresent(Attribute.viewProducts)) {
			toGo = '/products';
		}
		else if (AuthService.isAttributePresent(Attribute.viewMovements)) {
			toGo = '/movements'; 
		}

		// if nowhere toGo logout, and alert that the user has no accessible page
		if (!toGo) {
			// alert("Apri la sidebar per navigare");
		}
		else {
			RouterService.goto(toGo, true);
		}

	}

	render() { return (null); }

}

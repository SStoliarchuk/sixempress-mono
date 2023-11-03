// import { runTests } from './modernizr.js';

// /**
//  * Tests that the browsers has all the necessary modern stuff and permition
//  * AKA has the 
//  * access to localStorage (if cookies are disabled)
//  * 
//  * @returns true if the app can be generated
//  * @returns false if the app can be generated
//  */
// export function testBrowser(): any {

// 	// // please note, 
// 	// // that IE11 now returns undefined again for window.chrome
// 	// // and new Opera 30 outputs true for window.chrome
// 	// // but needs to check if window.opr is not undefined
// 	// // and new IE Edge outputs to true now for window.chrome
// 	// // and if not iOS Chrome check
// 	// // so use the below updated condition
// 	// const isChromium = (window as any).chrome;
// 	// const winNav = window.navigator;
// 	// const vendorName = winNav.vendor;
// 	// const isOpera = typeof (window as any).opr !== "undefined";
// 	// const isIEedge = winNav.userAgent.indexOf("Edge") > -1;
// 	// const isIOSChrome = winNav.userAgent.match("CriOS");
// 	// const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// 	// // is Google Chrome on IOS
// 	// // or apple safari
// 	// if (isIOSChrome || isSafari) {} 
// 	// // is Google Chrome
// 	// else if (
// 	// 	isChromium !== null &&
// 	// 	typeof isChromium !== "undefined" &&
// 	// 	vendorName === "Google Inc." &&
// 	// 	isOpera === false &&
// 	// 	isIEedge === false
// 	// ) { } 
// 	// // other browsers
// 	// else {
// 	// 	const alreadyAlerted = DataStorageService.localStorage.getItem(CacheKeys.browserTypeAlert);
// 	// 	if (!alreadyAlerted) {
// 	// 		alert("Attenzione! \nQuesta applicazione e' stata sviluppata per essere utilizzata con Google Chrome e/o Safari\n\nL'utilizzo di un altro browser non garantisce il corretto funzionamento dell'applicazione");
// 	// 		DataStorageService.localStorage.setItem(CacheKeys.browserTypeAlert, "true");
// 	// 	}
// 	// }


// 	if (!DataStorageService.canAccessBrowserStorage()) {
// 		alert('I cookie sono disabilitati. Non sara\' possibile ricordare alcuni valori impostati. Per riattivare i cookie: Impostazioni > Privacy > Cookies');
// 	}

// 	return testBrowserFeatures();
// }


// export function testBrowserFeatures(): any {

// 	const mod = runTests();
	
// 	// test with modernizr
// 	const notSupported = [];
// 	for (const feature in mod) {
// 		// eslint-disable-next-line 
// 		if ( typeof mod[feature] === "boolean" && mod[feature] == false ) {
// 			notSupported.push(feature);
// 			break;
// 		}
// 	}

// 	if (notSupported.length !== 0) { 
// 		return notSupported; 
// 	}


// 	// test custom manual stuff
// 	try {
		
// 		// test headers
// 		if ((!window as any).Headers) { throw new Error(); }
// 		const test_headers = new Headers();
// 		test_headers.set('name', 'value');

// 		// test prepend
// 		document.head.prepend();
// 		document.head.append();

// 		// test promises
// 		new Promise((r, j) => {});

// 	} 
// 	catch (e) {
// 		return e;
// 	}

// 	return;
// }

// /**
//  * Adds basic tutorial items to the system
//  */
// export function registerTutorialItems() {

// 	TutorialService.register({
// 		[TutorialKeys.tableFilterAndSettings]: {
// 			type: "pop",
// 			testid: TutorialNodeIds.tableFilterAndSettings,
// 			text: "Filtra la tabella in modo avanzato, e modifica la sua apparenza"
// 		},
// 		[TutorialKeys.dtTableResponsiveOpenDetail]: {
// 			type: "pop",
// 			querySelector: 'table[datatable][detailed] > tbody > tr:first-child > td:first-child:not([colspan])',
// 			text: "Premi qui per aprire i dettagli completi della riga"
// 		},
// 		[TutorialKeys.tableFilterBtns]: [{
// 			type: "pop",
// 			textExact: "Salva nuova tavola",
// 			text: "Salva permanentemente i filtri come nuova tavola"
// 		}, {
// 			type: "pop",
// 			testid: TutorialNodeIds.tableFilterPopupApply,
// 			text: "Applica temporaneamente i filtri sulla tabella corrente"
// 		}],
// 	});

// }

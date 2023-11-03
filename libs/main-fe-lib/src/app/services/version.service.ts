import { LoadingOverlay } from "../helper-components/loading-overlay/loading-overlay";
import { ErrorNames } from "../utils/errors/errors";
import { RequestService } from "./request-service/request-service";

export class VersionService {

	/**
	 * The time that the user has to be idle to check force check the latest version
	 */
	public static USER_IDLE_FORCE_CHECK_TIMEOUT_SECONDS = 7_200 // 2 hours

	/**
	 * Checks that the server is using the latest version. If not then deletes the caches and re-downloads the app
	 * USED in login-page as this component is not generated each time on PWAs, meanwihle login page can just exit and reenter and boom new app
	 */
	static async checkIfLatestVersion() {

		return;
		// get the last version
		// using param to prevent cache
		RequestService.request('get', '/hash-info.json', {params: {_: new Date().getTime()}}).then(
			res => {
				const r = {body: res.data};
				// if the tags do NOT match, then the version has changed. so reload everything
				if (!VersionService.areBaseScriptsAtLastVersion(r.body) || !VersionService.areLazyScriptsAtLastVersion(r.body)) {

					// remove service worker and force reload the page
					if (navigator.serviceWorker) {
						navigator.serviceWorker.getRegistration()
						.then(s => {
							if (s) {
								s.unregister()
								.then(d => VersionService.startUpdate())
								.catch(e => VersionService.startUpdate());	
							}
							else {
								VersionService.startUpdate();
							}
						})
						.catch(e => VersionService.startUpdate());	
					} 
					else {
						VersionService.startUpdate();
					}

				}

			}
		)
		.catch(
			e => {
				
				// if error with network
				// then just wait for online
				if (e && e.name === ErrorNames.NetworkErr) {
					VersionService.onBackOnline(() => {
						VersionService.checkIfLatestVersion();
					});
				}
				// else do not throw as it can be a 404 for when the contenxtService.environment.envName is not preset onload
				// or some other things idk
				//
				// but still, there is no use to throw here

			}
		);

	}


	private static onBackOnline(cb: () => void) {
		RequestService.checkConnectionStatus().then(r => {
			if (r === "OK") 
				cb();
			else
				setTimeout(() => VersionService.onBackOnline(cb), 2000);
		});
	}


	/**
	 * Takes the script that loads lazy components from the index.js
	 * and with some regex magic recreates the hashes
	 * 
	 * then compares the hashes with the retrieved hashes from the server
	 */
	private static areLazyScriptsAtLastVersion(hashInfoSrcs: string[]): boolean {
		const scripts = document.querySelectorAll('body > script');
		let loadingScriptText: string;

		// search the script that contains the hashes
		for (let i = 0; i < scripts.length; i ++) {
			const s = scripts[i];
			if (s.attributes.length !== 0) { continue; }

			const text = s.innerHTML;
			if (text.includes('static/js') && text.includes('chunk.js')) { loadingScriptText = text; }
		}

		// some instances could not have lazy scripts
		if (!loadingScriptText) { return true; }

		// this object is this format
		// {
		//   3: "a66f78c2"
		//   4: "ac72f8b1"
		// }
		// what is this ?
		const hashInfoObj: {[n: number]: string} = JSON.parse(loadingScriptText.match(/static\/js\/.*?({(?: )*[0-9]+:.*?(?:'|")}).*?\.chunk\.js/i)[1].replace(/([0-9]+):/gi, (s, m1) => '"' + m1 + '":'));

		// e.g. 
		// 3.a66f78c2
		// 4.ac72f8b1
		const strings: string[] = [];
		for (const n in hashInfoObj) { strings.push( n + '.' + hashInfoObj[n] ); }

		return VersionService.isAtLastVersion(strings, hashInfoSrcs);
	}

	/**
	 * Checks if main.script.js or lib.script.js are the latest versions
	 */
	private static areBaseScriptsAtLastVersion(hashInfoSrsc: string[]): boolean {
		const currTagInfo = [];

		const scripts = document.querySelectorAll('body > script');
		const styleSheets = document.querySelectorAll('link[rel="stylesheet"]');

		// adding with a regex match because chrome extensions add their own scripts/css
		// or some other things
		for (let i = 0; i < scripts.length; i ++) {
			const s = scripts[i];
			const att = s.getAttribute('src');
			if (att && att.match(/^\/.*static\/(js|css)\/.*/)) { currTagInfo.push(att); }
		}
		for (let i = 0; i < styleSheets.length; i ++) {
			const s = styleSheets[i];
			const att = s.getAttribute('href');
			if (att && att.match(/^\/.*static\/(js|css)\/.*/)) { currTagInfo.push(att); }
		}

		return VersionService.isAtLastVersion(currTagInfo, hashInfoSrsc);
	}

	/**
	 * ensures that the hashInfo contains the currentSrcs
	 * If it contains them then it's the last version
	 * 
	 * you dont need to reverse check
	 */
	private static isAtLastVersion(currentSrcs: string[], hashInfoSrcs: string[]): boolean {
		for (const src of currentSrcs) {
			
			// we need to match if the hash contains just the hash part, not all the paths etc..
			// 2.a662bc2f SHOULD MATCH /static/js/2.a662bc2f.js
			// 2.a662bc2f SHOULD MATCH /2/static/js/2.a662bc2f.js
			// /2/static/js/2.a662bc2f.js SHOULD MATCH /2/static/js/2.a662bc2f.js
			// etc..
			let anyoneMatches = false;
			for (const hash of hashInfoSrcs) {
				if (hash.includes(src)) { 
					anyoneMatches = true; 
					break;
				}
			}

			if (!anyoneMatches) {
				return false;
			}

		}

		return true;
	}

	/**
	 * Shows a loader icon and
	 * Reloads the page
	 */
	private static startUpdate() {
		LoadingOverlay.text = "Aggiornamento applicazione...";
		LoadingOverlay.loading = true;
		setTimeout(() => window.location.reload(), 1000);
	}


}

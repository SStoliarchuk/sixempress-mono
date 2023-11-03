export interface SSState {

	/**
	 * 1 == usage
	 * 2 == settings
	 */
	selectedPage: number;

	enabledPages: {
		usage: boolean,
		settings: boolean,
	};

}

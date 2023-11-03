// type DateString = `2017-03-23T17:03:12`;
export type DateString = string;
// export type DateString = `${number}${number}${number}${number}-${number}${number}-${number}${number}T${number}${number}:${number}${number}:${number}${number}`;

export interface WooBaseItem {
	/**
	 * Item ID.
	 * @readonly
	 */
	id?: number,
	/**
	 * The Status of the Item
	 */
	status?: 'trash' | (string & {});
}

export interface WooMetaData {
	/**
	 * Meta ID.
	 * @readonly
	 */
	id?: number,
	/**
	 * Meta key.
	 */
	key?: string,
	/**
	 * Meta value.
	 */
	value?: string,
}

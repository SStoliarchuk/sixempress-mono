export interface DecodedAuthToken {
	iss: number;
	exp: number | false;
	slug: string;
	/**
	 * leave this field ONLY in the AUTHENTICATION TOKEN
	 * Used to query the user for the authz token
	 */
	sub: string;
}


export interface DecodedAuthzToken {
	
	iss: number;
	/**
	 * False is used for API keys
	 */
	exp: number | false;
	slug: string;
	user: {
		_id: string,
		locs: string[],
		att: (string | number)[],
		name: string,
	};
	/**
	 * Extra data encoded by the BE
	 * 
	 * (encrypt before sending to user)
	 * (decrypt when decripting in the BE)
	 * 
	 * IT IS ONLY PRESENT WHEN THE USER AUTHENTICATES OR USES API-KEY
	 * 
	 * when the request is from the BE then this field doesnt exists
	 * so before using it check for existence
	 */
	data?: {
		locs?: (string)[],
	};

}

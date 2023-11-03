
export interface VerifyError {
	field: string;
	message: string;
	possibleErrors?: VerifyError[][];
}


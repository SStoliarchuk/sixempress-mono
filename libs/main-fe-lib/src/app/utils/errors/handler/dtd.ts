import { ConvertedError } from "../errors";

export interface UiServiceTriggerRequest {
	conv: ConvertedError;
	errorId?: string;
}

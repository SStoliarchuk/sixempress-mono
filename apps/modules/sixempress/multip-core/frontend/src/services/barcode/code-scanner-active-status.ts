/**
 * It's out here to prevent circular dependency
 * sometime on react-scripts build it dont throw circular dep
 * but on jest it throwed
 * 
 * idk why but ok
 */
export class CodeScannerEventsActiveStatus {
	public static isActive: boolean = true;
}

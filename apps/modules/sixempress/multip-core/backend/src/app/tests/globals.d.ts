import type { MultipTestTools, TestTools } from "../tests/commonTests";

declare global {
	
	/**
	 * Test Tools
	 */
	var tt: (typeof TestTools) & (typeof MultipTestTools);

}

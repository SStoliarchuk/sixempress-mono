import { connectToMongo, TestTools } from "./commonTest";


(global as any).tt = TestTools;

// set testSlug
export const testSlug = tt.testSlug;
export const appUse = tt.appUse;
export const generateAuthzString = tt.generateAuthzString;
export const generateRequestObject = tt.generateRequestObject;
export const dropDatabase = tt.dropDatabase;
export const getBaseControllerUtils = tt.getBaseControllerUtils;
connectToMongo();
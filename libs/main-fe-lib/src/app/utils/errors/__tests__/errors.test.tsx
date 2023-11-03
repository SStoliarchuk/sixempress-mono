import { Err, ErrorNames, AuthErr, NetworkErr, SystemError } from "../errors";
import { ConnectionStatus } from "../../enums/fe-error-codes.enum";
import { ErrorFactory } from "../error-factory";

describe("Errors errors.ts", () => {

	it("generates the correct name and trace level", () => {
		let err: Err;
		

		err = new Err("Error");
		expect(err.name).toBe(ErrorNames.Err);
		expect(err.level).toBe(0);
		expect(err.trace).toEqual(new Error("Error"));
		
		err = new Err("Error", new Error("Error 2"));
		expect(err.level).toBe(0);
		expect(err.trace).toEqual(new Error("Error 2"));

		err = new Err("Error", new Err("Error 2"));
		expect(err.level).toBe(1);
		expect(err.trace).toEqual(new Err("Error 2"));



		err = new AuthErr();
		expect(err.name).toBe(ErrorNames.AuthErr);
		expect(err.level).toBe(0);
		expect(err.trace).toEqual(new Error("NOT AUTHORIZED"));

		err = new AuthErr(new Err("Error"));
		expect(err.level).toBe(1);
		expect(err.trace).toEqual(new Err("Error"));



		err = new NetworkErr(ConnectionStatus.clientDown);
		expect(err.name).toBe(ErrorNames.NetworkErr);
		expect(err.level).toBe(0);
		expect(err.trace).toEqual(new Error(ConnectionStatus.clientDown));

		err = new NetworkErr(ConnectionStatus.serverDown);
		expect(err.trace).toEqual(new Error(ConnectionStatus.serverDown));
	});

});

describe("ErrorFactory error-factory.ts", () => {

	it("make()", () => {
		let err: Err | AuthErr;

		err = ErrorFactory.make("Error");
		expect(err.name).toBe(ErrorNames.Err);

		err = ErrorFactory.make("Error", new Err("Asd"));
		expect(err.name).toBe(ErrorNames.Err);

		err = ErrorFactory.make("Error", new AuthErr("Asd"));
		expect(err.name).toBe(ErrorNames.AuthErr);
	});


	it("handleObs()", () => {

		let res: (err) => void;

		jest.spyOn(ErrorFactory, 'make');
		res = ErrorFactory.handleObs("err-message");
		expect(() => res(new Error("error"))).toThrowError(new Err("err-message"));
		expect(ErrorFactory.make).toHaveBeenCalledTimes(1);

		const obsErrorFn = jest.fn();
		res = ErrorFactory.handleObs("error", {error: obsErrorFn} as any);
		res(new Error("error"));
		expect(obsErrorFn).toHaveBeenCalledTimes(1);
		expect(ErrorFactory.make).toHaveBeenCalledTimes(2);
		expect(ErrorFactory.make).toHaveBeenCalledWith("error", new Error("error"));

		res = ErrorFactory.handleObs("err-message");
		expect(() => res(new AuthErr("error"))).toThrowError(new AuthErr("err-message"));
	});

});

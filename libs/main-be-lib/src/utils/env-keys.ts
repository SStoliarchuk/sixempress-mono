import dotenv from 'dotenv';

export enum EnvKeys {
	/**
	 * Used to hash jwt token data for the signature
	 */
	jwt = 'JWTSIGNATUREHASH',
	/**
	 * Used to pepper the passwords salt
	 */
	passwordPepper = 'PASSWORDPEPPER',
	
	/**
	 * the public key path for the master-slave communication
	 */
	publicKeyPath = 'PUBLICKEYPATH',
	/**
	 * The public key of the control server for cross server communication
	 */
	controlPublicKeyPath = 'CONTROLPUBLICKEYPATH',
	/**
	 * the private key path for the master-slave communication
	 */
	privateKeyPath = 'PRIVATEKEYPATH',

	/**
	 * The type of the environment that the server is deployed into
	 * "local" | "test" | "production"
	 */
	environmentType = 'ENVIRONMENT',

	/**
	 * The URI to use to connect to mongodb
	 */
	mongoDbUri = 'MONGODBURI',

	/**
	 * The external port of the server, if present is used instead of calculating with startingExtPort
	 */
	extPort = 'PORT',

	MAILHOST = 'MAILHOST',
	MAILAUTHUSER = 'MAILAUTHUSER',
	MAILAUTHPASS = 'MAILAUTHPASS',
}


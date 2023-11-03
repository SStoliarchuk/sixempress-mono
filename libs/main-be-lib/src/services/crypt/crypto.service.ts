import fs from 'fs';
import crypto from 'crypto';
import { EnvKeys } from '../../utils/env-keys';

/**
 * This service should be initialized in the main.js
 */
export class CryptoService {

	public static controlPublic: string;
	public static currentPublic: string;
	public static currentPrivate: string;

	/**
	 * Retrieves the Keys used for communications with the main server
	 */
	public static initialize() {
	}

	/**
	 * Creates the sign for a specific content
	 * @param content The content to sign
	 * @param privateKey The private key to use to sign the content
	 */
	public static sign(content: string, privateKey: string | Buffer) {
		const sign = crypto.createSign('RSA-SHA256');
		sign.update(content);
		return sign.sign(privateKey, 'base64');
	}


	/**
	 * Verifies that a sign is correct and valid
	 * @param content the content of the sign
	 * @param sign the sign given
	 * @param publicKey The public key of the signer
	 */
	public static verifySign(content: string, sign: string, publicKey: string | Buffer) {
		const verify = crypto.createVerify('RSA-SHA256');
		verify.update(content);
		return verify.verify(publicKey, sign, 'base64');
	}

}

import crypto from 'crypto';
import { Request } from 'express';
import { environment as config } from '../../environments/environment';

export class PasswordCrypt {

	private static config = {
		pepperSize: 14,
		// size of the generated hash
		hashBytes: 32,
		// larger salt means hashed passwords are more resistant to rainbow table, but
		// you get diminishing returns pretty fast
		saltBytes: 16,
		// let's aim for 800ms ??
		iterations: 5_000,
		// alg of pbkdf2
		digest: 'sha512',

    characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
	};
	
	private static getRandomChars(length: number) {
    let result           = '';
    let charactersLength = PasswordCrypt.config.characters.length;
    for ( let i = 0; i < length; i++ )
			result += PasswordCrypt.config.characters.charAt(Math.floor(Math.random() * charactersLength));
    return result;
	}

	/**
	 * salts and hashes the pass ?
	 */
	public static async hashPassword(req: Request, password: string): Promise<string> {
		if (!password)
			throw new Error('Cannot hash empty password');
			
		const salt = Buffer.from(PasswordCrypt.getRandomChars(PasswordCrypt.config.characters.length));
		const pepper = await PasswordCrypt.addPepper(req, password);
		const hash = crypto.pbkdf2Sync(pepper, salt, PasswordCrypt.config.iterations, PasswordCrypt.config.hashBytes, PasswordCrypt.config.digest);
		return hash.toString('hex') + '.' + salt.toString('hex') + '.' + PasswordCrypt.config.iterations + '.' + PasswordCrypt.config.hashBytes + '.' + PasswordCrypt.config.digest;
	}

	public static generateApiKey() {
		const r1 = PasswordCrypt.getRandomChars(5), r2 = PasswordCrypt.getRandomChars(5)
		const hash = crypto.pbkdf2Sync(r1, r2, PasswordCrypt.config.iterations, PasswordCrypt.config.hashBytes, PasswordCrypt.config.digest);
		return hash.toString('hex');
	}
	
	/**
	 * Verify a hashed password
	 */
	public static async verifyPassword(req: Request, dbPass: string, toCheck: string): Promise<boolean> {
		if (!toCheck)
			return false;

		const split = dbPass.split('.');
		const hash = split[0];
		const salt = split[1];
		const iterations = parseInt(split[2]);
		const hashBytes = parseInt(split[3]);
		const digest = split[4];


		// verify the salt and hash against the password
		const pepper = await PasswordCrypt.addPepper(req, toCheck);
		const verify = crypto.pbkdf2Sync(pepper, Buffer.from(salt, 'hex'), iterations, hashBytes, digest);
		return verify.toString('hex') === hash;
	}
	
	/**
	 * Adds pepper ensuring the minimum length of the pepper is as given in the config
	 */
	public static async addPepper(req: Request, p: string) {
		const sysPepper = (await use_filter.sxmp_labac_pepper_seed(req, 'seed')) + config.pepper;
		let pepperToUse = sysPepper;
	
		while (pepperToUse.length < PasswordCrypt.config.pepperSize) {
			pepperToUse += pepperToUse;
		}
		pepperToUse = pepperToUse.slice(0, PasswordCrypt.config.pepperSize);
	
		return pepperToUse[0] + p + pepperToUse;
	}

}


const crypto = require('crypto');

class PasswordCrypt {

  static config = {
    pepperSize: 14,
    // size of the generated hash
    hashBytes: 32,
    // larger salt means hashed passwords are more resistant to rainbow table, but
    // you get diminishing returns pretty fast
    saltBytes: 16,
    iterations: 5_000,
    // alg of pbkdf2
    digest: 'sha512',

    characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  };

  // static config = {
	// 	pepperSize: 14,
	// 	// size of the generated hash
	// 	hashBytes: 32,
	// 	// larger salt means hashed passwords are more resistant to rainbow table, but
	// 	// you get diminishing returns pretty fast
	// 	saltBytes: 16,
	// 	// let's aim for 800ms ??
	// 	iterations: 50_599,
	// 	// alg of pbkdf2
	// 	digest: 'sha512',
  //   characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
	// };


  static makesalt() {
    let result           = '';
    let charactersLength = PasswordCrypt.config.characters.length;
    for ( let i = 0; i < PasswordCrypt.config.saltBytes; i++ )
			result += PasswordCrypt.config.characters.charAt(Math.floor(Math.random() * charactersLength));
    return result;
	}

  /**
   * Create a hashed password with salt and pepper
   */
  static async hashPassword(pepper, password) {
    return new Promise((r, j) => {
      const salt = Buffer.from(PasswordCrypt.makesalt());
      const hash = crypto.pbkdf2Sync(PasswordCrypt.addPepper(pepper, password), salt, PasswordCrypt.config.iterations, PasswordCrypt.config.hashBytes, PasswordCrypt.config.digest);
      r(hash.toString('hex') + '.' + salt.toString('hex') + '.' + PasswordCrypt.config.iterations + '.' + PasswordCrypt.config.hashBytes + '.' + PasswordCrypt.config.digest);
    });
  }
  
  /**
   * Verify a hashed password
   */
  static async verifyPassword(dbPass, toCheck, pepper) {
    return new Promise((r, j) => {
      
      const split = dbPass.split('.');
      const hash = split[0];
      const salt = split[1];
      const iterations = parseInt(split[2]);
      const hashBytes = parseInt(split[3]);
      const digest = split[4];
  
  
      // verify the salt and hash against the password
      const verify = crypto.pbkdf2Sync(PasswordCrypt.addPepper(pepper, toCheck), Buffer.from(salt, 'hex'), iterations, hashBytes, digest);
      r(verify.toString('hex') === hash);
    });
  }
  /**
   * Adds pepper ensuring the length of the pepper is equal to the config
   */
  static addPepper(pepper, password) {
    while (pepper.length < PasswordCrypt.config.pepperSize) {
      pepper += pepper;
    }
    pepper = pepper.slice(0, PasswordCrypt.config.pepperSize);
  
    // add some trickery
    return pepper[0] + password + pepper;
  }

}

async function createPassword(usePassword = 'pass', envPepper) {
  const pepper = envPepper;
  const password = usePassword;
  const dbPass = await PasswordCrypt.hashPassword(pepper, password);
  return dbPass;
}

if (require.main === module) {
  (async () => {
    if (!process.argv[2] || !process.argv[3])
      throw new Error('Required two params: {pass} {pepper}');
    
    const p = await createPassword(process.argv[2], process.argv[3]);
    const d = await PasswordCrypt.verifyPassword(p, process.argv[2], process.argv[3]);
    console.log('verified: ', d);
    console.log(p);
  })();
}

module.exports = {
  createPassword,
}
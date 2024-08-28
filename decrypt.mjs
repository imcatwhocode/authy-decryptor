import { readFileSync } from "fs";
import { createDecipheriv, pbkdf2Sync } from "crypto";

// Read the JSON from stdin, then filter out non-TOTP tokens
const contents = JSON.parse(
  readFileSync(0, "utf8")
).authenticator_tokens.filter((t) => t.encrypted_seed !== undefined);

// The IV is static and equals 16 NULL bytes
const IV = Buffer.from("00000000000000000000000000000000", "hex");

// Obtain your backup key from the environment variable
const backupKey = process.env.BACKUP_KEY;

/**
 * Decrypts the seed using the backup key and the account's salt
 * @param {String} seed Encrypted seed
 * @param {String} salt Account salt
 * @returns {String} Decrypted seed
 */
function decryptSync(seed, salt) {
  // Authy uses PBKDF2 with PKCS5 padding and 100,000 iterations of SHA1.
  // Here, we derive the key from the backup key and the account's salt
  const key = pbkdf2Sync(backupKey, salt, 100000, 32, "sha1");

  // Then, we decrypt the seed using AES-256-CBC with the derived key and static IV
  const decipher = createDecipheriv("aes-256-cbc", key, IV);
  decipher.setAutoPadding(false);
  const ciphertext = Buffer.from(seed, "base64");
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  // Return the decrypted seed as a UTF-8 string
  return decrypted.toString("utf8");
}

// Iterate over each token and decrypt the seed phrase, then output it to stdout
// along with the token's name and original name
for (const token of contents) {
  const decrypted = decryptSync(token.encrypted_seed, token.salt);
  console.log(`${token.name} (${token.original_name})\t ${decrypted}`);
}

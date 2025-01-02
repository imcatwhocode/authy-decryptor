import { readFileSync } from "fs";
import { createDecipheriv, pbkdf2Sync } from "crypto";
import fs from 'fs';
import { v4 as uuidv4, v6 as uuidv6 } from 'uuid';

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
  const ciphertext = Buffer.from(seed, "base64");
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  // Return the decrypted seed as a UTF-8 string
  return decrypted.toString("utf8");
}

// BitWarden format header
let tobewritten = {
  "encrypted": false,
  "folders": [
      {
          "id": uuidv4(),
          "name": "Extracted from Authy"
      }
  ],
  "items": []
}

// Iterate over each token and decrypt the seed phrase, then output it to stdout, as well as the BitWarden JSON format
// along with the token's name and original name
for (const token of contents) {
  const decrypted = decryptSync(token.encrypted_seed, token.salt);
  console.log(`${token.name} (${token.original_name})\t ${decrypted}`);
  fs.appendFileSync('authyout.txt', `${token.name} (${token.original_name})\t ${decrypted}\n`);
  tobewritten.items.push({
    "id": uuidv4(),
    "organizationId": null,
    "folderId": tobewritten.folders[0].id,
    "type": 1,
    "reprompt": 0,
    "name": token.name,
    "notes": token.original_name,
    "favorite": false,
    "login": {
        "username": null,
        "password": null,
        "totp": `otpauth://totp/${token.name}?secret=${decrypted}&digits=${token.digits}&period=30`
    },
    "collectionIds": null
  })
}

// Write the BitWarden JSON to a file
fs.writeFileSync('authyout.json', JSON.stringify(tobewritten, null, 2));

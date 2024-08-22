# Authy Keychain Decryptor

After discontinuation of Authy Desktop app, it is no longer possible to neither access nor export your 2FA tokens on desktop.

This script makes it possible to **partially** (around 90% in my case) extract your tokens from cached data of **Authy iOS app installed on macOS**.

I wrote it for myself in about an hour, so it's far from perfect, but should work. Feel free to improve it :-)

There are likely much better ways to do this, but I found it utterly boring to deeper reverse-engineer the app.

## Step 1 – Locate cached keychain

What we are looking for is an encrypted keychain file in iOS Storage Container.

You can use this command to find the right Container, but it requires a
Full Disk Access permission for your Terminal app:

```shell
find ~/Library/Containers/ \
  -maxdepth 1 -type d \
  -regex ".*/[A-F0-9]\{8\}-[A-F0-9]\{4\}-[A-F0-9]\{4\}-[A-F0-9]\{4\}-[A-F0-9]\{12\}" \
  -exec find {} -type f -path "*/Data/Library/Caches/com.authy/fsCachedData/*" \; | \
  xargs grep -l "authenticator_tokens"
```

Otherwise, you can search for the keychain file manually:

1. In Finder, go to your home directory, then to `Library/Containers/`.
2. Look for directories with UUID names like `A8A8A8A8-A8A8-A8A8-A8A8-A8A8A8A8A8A8`.
3. In each directory, look for `Data/Library/Caches/com.authy/fsCachedData` folder.
4. If you find such a folder, look for a file with JSON content and `authenticator_tokens` key in it.

## Step 2 – Decrypt keychain

**First, audit the `decrypt.mjs` script contents.**
There should be no large strings, network requests, or anything else suspicious.
The original script is throughly commented and should be easy to understand.

Then, run the script with the path to the keychain file as an argument:

```shell
cat ~/Library/Containers/.../00000000-0000-0000-0000-000000000000 | BACKUP_KEY="your-cool-bACKup-KEY" node decrypt.mjs
```

You should now see your Authy tokens decrypted.

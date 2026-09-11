# Shelfmark

A personal book collection tracker: keep a catalog of what you own, a wishlist
with prices you've found, and compare against what you eventually pay.

No build step — it's plain HTML/JS, so you can push it straight to GitHub
Pages. Your data lives in Firebase (free tier) so it follows you across
devices, protected behind a sign-in that only you can use.

## 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and click **Add project**. Any name is fine.
2. You can skip Google Analytics — not needed for this.

## 2. Turn on Email/Password sign-in

1. In the left sidebar: **Build > Authentication > Get started**.
2. Under **Sign-in method**, enable **Email/Password**.

## 3. Create your account (the app has no public sign-up screen — this is the only way in)

1. Still in **Authentication**, go to the **Users** tab.
2. Click **Add user**, enter the email and password you want to log in with.
3. That's the only account that will ever exist — the site has no sign-up form, so no one else can create one.

## 4. Create the database

1. **Build > Firestore Database > Create database**.
2. Choose any region close to you. Start in **production mode**.
3. Once it's created, go to the **Rules** tab and replace the contents with what's in `firestore.rules` in this folder, then click **Publish**.

## 5. Get your web app config

1. Click the gear icon next to **Project Overview > Project settings**.
2. Under **Your apps**, click the **</>** (web) icon to register a new web app. Any nickname is fine, and you don't need Firebase Hosting.
3. Copy the `firebaseConfig` object it gives you.
4. Open `firebase-config.js` in this folder and paste your values in, replacing the placeholders.

## 6. Push to GitHub

If you're new to git, the easiest path is the GitHub website itself:

1. Go to [github.com/new](https://github.com/new), create a repository (e.g. `shelfmark`), keep it **Public** (GitHub Pages on the free plan requires a public repo).
2. On the new repo's page, click **uploading an existing file**, and drag in all the files from this folder (`index.html`, `app.js`, `firebase-config.js`, `firestore.rules`, `README.md`).
3. Commit the files.

Or, if you're comfortable with the command line:

```bash
cd shelfmark-site
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/shelfmark.git
git push -u origin main
```

## 7. Turn on GitHub Pages

1. In your repo, go to **Settings > Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Branch: `main`, folder: `/ (root)`. Save.
4. After a minute or two, your site will be live at `https://YOUR_USERNAME.github.io/shelfmark/`.

## 8. Log in

Visit your new URL and sign in with the email and password you created in step 3.

---

### Notes

- **Multiple devices**: since data lives in Firestore, signing in from your phone or another computer shows the same collection and wishlist.
- **Cover art & autofill**: enter an ISBN on the add-book form and click "Look up" — it pulls the title/author from Open Library and shows the cover automatically. If a book isn't found, just fill in the fields by hand.
- **Cost**: Firebase's free "Spark" tier covers personal use like this comfortably — you'd need very heavy usage to hit any limits.
- **Making changes later**: since there's no build step, you can edit `app.js` or `index.html` directly on GitHub (or locally) and just push — no compiling needed.

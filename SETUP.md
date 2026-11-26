# Golden Sip: live menu saving (setup, about 5 minutes, one time)

## Files in this package (only the changes)
- `app.js`          -> REPLACE the existing app.js
- `api/_lib.js`     -> NEW (create a folder named `api` in the project root, next to index.html)
- `api/menu.js`     -> NEW
- `api/auth.js`     -> NEW
Do NOT change index.html, styles.css, images.js, menu-data.js or menu.json.

## 1. Add the database (free)
Vercel dashboard -> your project -> Storage -> Marketplace -> **Upstash Redis** (free plan) -> connect to the project.
Vercel adds the keys automatically.

## 2. Add one setting in Vercel
Project -> Settings -> Environment Variables:
- `SESSION_SECRET` = any long random text (e.g. 40 random characters)

## 3. Deploy
Put the 4 files in your repository (GitHub) and commit; Vercel redeploys automatically.
If you add the settings AFTER deploying, click Redeploy once.

## How it works now
- Owner page (#owner): sign in with your SAME email/phone + password as before (unchanged).
- Every price change, availability toggle, new dish, new category, deleted dish or deleted category is saved to the server instantly and all guests see it on refresh. No more downloading menu.json.
- The first save copies your current menu to the server. Until then the site uses menu.json as before.

## Test checklist
1. Open /#owner, sign in, change a price -> toast says "Live for all guests".
2. Open the site in another browser/phone -> new price is visible.
3. Add a dish and a category; delete a dish; delete a category (tap the bin twice).

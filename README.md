# AC Ledger Solutions — launch site

One scrolling page (`index.html`). Menu: Home, About Us, Services, Contact.
Plain HTML/CSS/JS with Tailwind from CDN — no build step. Upload the folder to any static host.

## Things to fill in (search index.html for these)
- Favicon: `assets/favicon.ico`, `assets/favicon-16x16.png`, `assets/favicon-32x32.png`, `assets/apple-touch-icon.png` (and `assets/icon-192.png`, `assets/icon-512.png` for manifest.json) (made from the logo)
- Logo: `assets/logo-mark.png` (cut from your logo card). Replace the file with a higher-resolution logo if you have one
- Home background: animated logo scene (SVG logo, typewriter title, particles) — styles in css/styles.css, script at the end of js/main.js. `animated-background.html` is the same scene as a standalone page
- `INTRO PARAGRAPH` — final intro text
- Team: four cards with photos in `assets/team-1.jpg` … `team-4.jpg` (replace the files to change a photo). Update each "Team Member Name / Title" and the image `alt` text
- Six service blocks — edit titles/descriptions (keep "Contact us for a quote")

## Contact form (Google Sheet + email alert + auto-reply)
The form posts to a Google Apps Script web app (`apps-script/Code.gs`, setup in `docs/SETUP-GOOGLE-SHEET.md`). Each enquiry becomes a row in the sheet, you get an email alert, and the visitor gets an auto-reply. Edit the owner email, phone and reply wording in `CFG` / `autoReply_` in `Code.gs`. The web app URL is set in `index.html` (form action and `window.AC_ENQUIRY_WEBHOOK`). Spam protection: honeypot + minimum-time check.
After a successful send, the form is replaced by an animated thank-you message (`#form-thanks` in `index.html`).

## Colors
Navy/gray values are at the top of the `<style type="text/tailwindcss">` block in index.html.

## Three.js backgrounds
`js/three-scenes.js` adds animated 3D backgrounds to the Home (wireframe shapes) and About (team network — each team photo is a node; hovering a photo lights it up) sections. Three.js loads from the jsDelivr CDN (pinned r160). If it cannot load, the site still works without the 3D layer. Animations pause off-screen and are static for visitors who prefer reduced motion.

## Animations & responsive layout
- Every block fades/slides in on scroll via `data-reveal` (variants: default up, `left`, `right`, `zoom`, `fade`; stagger with `style="--d:80ms"`). Styles are at the end of `css/styles.css`.
- Layout is tuned for phone (<640px), tablet (640-1023px), desktop (1024px+) and large screens (1536px+). Animations switch off for visitors who prefer reduced motion.


# AC Ledger Solutions — launch site

One scrolling page (`index.html`). Menu: Home, About Us, Services, Contact.
Plain HTML/CSS/JS with Tailwind from CDN — no build step. Upload the folder to any static host.

## Things to fill in (search index.html for these)
- Favicon: `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` (made from the logo)
- Logo: `assets/logo-mark.png` (cut from your logo card). Replace the file with a higher-resolution logo if you have one
- Home background: animated logo scene (SVG logo, typewriter title, particles) — styles in css/styles.css, script at the end of js/main.js. `animated-background.html` is the same scene as a standalone page
- `INTRO PARAGRAPH` — final intro text
- Team: four cards with photos in `assets/team-1.jpg` … `team-4.jpg` (replace the files to change a photo). Update each "Team Member Name / Title" and the image `alt` text
- Six service blocks — edit titles/descriptions (keep "Contact us for a quote")

## Contact form (auto-response + Excel log)
See `docs/SETUP-ENQUIRIES.md` for the SharePoint Excel log and `docs/Enquiries-template.xlsx` (the file to upload). The visitor auto-reply text is the hidden `_autoresponse` field in `index.html`.

Posts to FormSubmit -> kgdevstudio@gmail.com (temporary; change the address in the form action in index.html to switch). Sends from the page without leaving it (FormSubmit AJAX, `data-ajax` on the form) and auto-replies to the visitor. Spam protection: honeypot + minimum-time check.
One-time step: submit a test entry, then click the activation link emailed to kgdevstudio@gmail.com.

## Colors
Navy/gray values are at the top of the `<style type="text/tailwindcss">` block in index.html.

## Three.js backgrounds
`js/three-scenes.js` adds animated 3D backgrounds to the Home (wireframe shapes) and About (team network — each team photo is a node; hovering a photo lights it up) sections. Three.js loads from the jsDelivr CDN (pinned r160). If it cannot load, the site still works without the 3D layer. Animations pause off-screen and are static for visitors who prefer reduced motion.

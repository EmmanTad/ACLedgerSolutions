# Enquiries in Google Sheets + email alert + auto-reply (about 5 minutes)

Each enquiry from the website form is saved as a row in a Google Sheet, you get an email alert, and the visitor gets an auto-reply.

1. Open your Google Sheet (or create a blank one named **AC Ledger Enquiries**).
2. **Extensions > Apps Script**. Delete the existing code, paste everything from `apps-script/Code.gs`, click **Save**.
3. Run **testLead** once from the editor and approve the permissions (Advanced > Go to project > Allow). A test row and two test emails should appear.
4. **Deploy > New deployment > Web app**. Execute as **Me**, access **Anyone**. Click **Deploy**.
   Updating an existing deployment instead? **Deploy > Manage deployments > Edit (pencil) > Version: New version > Deploy**. The URL stays the same.
5. Copy the Web app URL (ends in `/exec`). Open it in a browser: you should see `{"ok":true,...}`.
6. If the URL differs from the one in `index.html`, replace it in two places: the form `action` and `window.AC_ENQUIRY_WEBHOOK`.
7. Upload the site and send a test enquiry from the form.

Sheet columns: Received, Name, Email, Phone, Service, Message, Status (dropdown), Notes. Rows go to a tab named **Enquiries**.

## Notes
- Settings (owner email, phone, SMS alert) are in `CFG` at the top of `Code.gs`. SMS via Semaphore is off until you fill in `SEMAPHORE_KEY` and `OWNER_PHONE`.
- Google limits free accounts to roughly 100 script emails a day, which is plenty for enquiries.
- The web app URL is visible in the page source. Anyone who finds it could post fake rows, so keep the sheet private. You can set `TOKEN` in `Code.gs` for extra protection, but it would also be visible in the page.

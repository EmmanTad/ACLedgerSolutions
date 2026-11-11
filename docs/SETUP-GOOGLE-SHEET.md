# Enquiry log in Google Sheets (about 5 minutes)

Every enquiry sent from the website form is added as a new row in a Google Sheet.

1. Go to https://sheets.google.com and create a blank sheet named **AC Ledger Enquiries**.
2. Menu **Extensions > Apps Script**. Delete the sample code and paste in everything from `apps-script/Code.gs`. Click **Save**.
3. Click **Deploy > New deployment**. Click the gear icon, choose **Web app**, and set:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy** and approve the permissions (Advanced > Go to project > Allow).
5. Copy the **Web app URL** (it ends in `/exec`). Open it in a browser. You should see `{"ok":true,...}`.
6. In `index.html`, near the bottom, set the URL:
   `<script>window.AC_ENQUIRY_WEBHOOK = "PASTE_URL_HERE";</script>`
7. Upload the site again and submit a test enquiry. A row appears on the **Enquiries** tab.

Columns: Received, Name, Email, Phone, Service, Message, Page, Status (dropdown: New / Contacted / Quoted / Won / Closed), Notes.

## Notes
- If you change `Code.gs` later, use **Deploy > Manage deployments > Edit > New version** or the live URL keeps running the old code.
- The row is added after the email send succeeds. Email delivery still goes through the form service in `index.html`.
- The web app URL is visible in the page source. Anyone who finds it can post rows, so keep the sheet's sharing private and ignore junk rows.

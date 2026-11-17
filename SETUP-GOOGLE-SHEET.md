# Enquiries in Google Sheets + email alert + auto-reply (about 5 minutes)

Each enquiry from the website form is saved as a row in a Google Sheet, you get an email alert, and the visitor gets an auto-reply.

1. Open your Google Sheet (or create a blank one named **AC Ledger Enquiries**).
2. **Extensions > Apps Script**. Delete the existing code, paste everything from `apps-script/Code.gs`, click **Save**.
3. Run **setup** once from the editor and approve the permissions. It adds the Status, Appointment and Customer Notified columns, the Status dropdown, and the trigger that emails customers when the status changes.
3b. Run **testLead** once from the editor and approve the permissions (Advanced > Go to project > Allow). A test row and two test emails should appear.
4. **Deploy > New deployment > Web app**. Execute as **Me**, access **Anyone**. Click **Deploy**.
   Updating an existing deployment instead? **Deploy > Manage deployments > Edit (pencil) > Version: New version > Deploy**. The URL stays the same.
5. Copy the Web app URL (ends in `/exec`). Open it in a browser: you should see `{"ok":true,...}`.
6. If the URL differs from the one in `index.html`, replace it in two places: the form `action` and `window.AC_ENQUIRY_WEBHOOK`.
7. Upload the site and send a test enquiry from the form.

Sheet columns: Time Received, Customer ID, Full name, Business name, Email, Phone, Service, How can we help?, Status (dropdown), Appointment, Notes, Customer Notified. Rows go to the tab named in `CFG.SHEET_NAME`.

## Customer ID
Every customer gets a unique ID (`ACL-0001`, `ACL-0002`, ...) in the **Customer ID** column. A returning customer with the same email keeps the same ID; a new email gets the next number. Running **setup** gives IDs to existing rows. The ID also appears in the owner alert and in the emails to the customer as a reference. Change the prefix with `ID_PREFIX` in `CFG`. Don't edit IDs by hand.

## Status emails
New enquiries start as **New**. When you change the Status dropdown, the customer gets the matching email:

| Status | Email to customer |
|---|---|
| New | none (they already got the auto-reply) |
| Booked | "Your consultation is booked" |
| Scheduled | "Your appointment is scheduled" |
| Completed | "Thank you" |
| Cancelled | "Your consultation has been cancelled" |

- Type the date/time in the **Appointment** column *before* choosing Scheduled/Booked and it appears in the email.
- **Customer Notified** shows what was sent and when (or why it failed). The same status is never emailed twice in a row.
- Edit wording or add statuses in `STATUS_EMAILS` at the top of `Code.gs`, then run **setup** again to refresh the dropdown.
- Changing the status by pasting or dragging also sends emails, so be careful with bulk edits.

## Notes
- Settings (owner email, phone, SMS alert) are in `CFG` at the top of `Code.gs`. SMS via Semaphore is off until you fill in `SEMAPHORE_KEY` and `OWNER_PHONE`.
- Google limits free accounts to roughly 100 script emails a day, which is plenty for enquiries.
- The web app URL is visible in the page source. Anyone who finds it could post fake rows, so keep the sheet private. You can set `TOKEN` in `Code.gs` for extra protection, but it would also be visible in the page.

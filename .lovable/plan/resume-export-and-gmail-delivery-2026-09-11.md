# Resume export and Gmail delivery

## What will change

- Replace the resume’s plain-text download with a format chooser for editable Word (`.docx`) or PDF (`.pdf`) with proprly rendered live preview with ATS Score.
- Generate both files from the current on-screen resume fields, including summary, experience, education, and skills.
- Keep Word output editable and make the PDF clean, selectable, and ATS-friendly.
- Replace Resend delivery with Gmail SMTP using a Gmail address and its 16-character App Password from the existing local `.env` setup.
- Update all email status messages and setup documentation to reference Gmail rather than Resend.

## Technical details

- Use browser-compatible document libraries for DOCX and PDF generation so downloads happen directly from Resume Studio.
- Use a Worker-compatible SMTP approach for server-side Gmail delivery; validate required settings and preserve `email_outbox` logging and honest queued/failed states.
- Expected server-only variables: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and optional `EMAIL_FROM_NAME`.
- Remove obsolete `RESEND_API_KEY` and `EMAIL_FROM` references from the configuration template and user-facing messages.

## Verification

- Run focused checks for Word/PDF generation and email configuration behavior.
- Open Resume Studio in the browser, trigger both download options, and confirm valid non-empty files are produced.
- Confirm the app compiles and no Resend references remain in active mail flows.
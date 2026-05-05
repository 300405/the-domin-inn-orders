# Stock Order App

A lightweight internal app for building and submitting stock purchase requests.

## Run it

```sh
npm start
```

Open `http://localhost:4173`.

## What it does

- Shows a stock catalogue with category, pack size, stock on hand, par level, and reorder prompts.
- Installs on phones, iPads, and Macs as `The Domin Inn Orders` once hosted.
- Filters by category or search.
- Saves the live stock catalogue in `stock-items.json`, so deleted items stay deleted after restart.
- Lets you delete stock items that are no longer sold from the item card.
- Builds an order basket with editable quantities.
- Submits a stock order to the local server, returns an order number, and saves JSON plus PDF copies in the `orders/` folder.
- Shows saved orders in the left rail so previous orders can be reviewed, opened as PDFs, printed, or deleted.

Orders are saved as JSON and PDF files in `orders/`, so restarting the server will not clear them.

## Hosting

The app is ready for Render hosting with `render.yaml`.

Use these environment variables online:

```sh
DATA_DIR=/data
HOST=0.0.0.0
ORDER_APP_PASSWORD=choose-a-staff-password
```

`ORDER_APP_PASSWORD` enables the password prompt for the public app. Render's persistent disk stores `stock-items.json` and the `orders/` PDFs.

## Email Notifications

New orders can email the PDF automatically when SMTP variables are set:

```sh
ORDER_NOTIFY_EMAIL=thedominoinn@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=thedominoinn@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=thedominoinn@gmail.com
```

For Gmail, turn on 2-Step Verification in the Google account, then create an App Password for this app. Use that 16-character App Password as `SMTP_PASS`; do not use the normal Gmail login password.

If these are not set, orders still save normally but no email is sent.

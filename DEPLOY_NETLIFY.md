# Deploy DESTINEX on Netlify

The Windows launcher continues to use the local Python and SQLite demo. Netlify serves the responsive web interface and runs the API through Netlify Functions with Netlify Database (Postgres).

## Connect the GitHub repository

1. In Netlify, connect your GitHub account and authorize access to RAMKUMAR7771/DESTINEX.
2. Choose the main branch. If Destinex is unavailable as the site name, choose another unique name, for example destinex-mvp-ramkumar7771.
3. The repository's netlify.toml sets the publish folder to web and Functions folder to netlify/functions.
4. The @netlify/database dependency and migration file configure the Postgres database for this project.

## Set the first administrator

Before using the admin dashboard, open the Netlify project settings and add these environment variables:

| Name | Value |
| --- | --- |
| DESTINEX_ADMIN_EMAIL | The email address you will use to sign in as the administrator |
| DESTINEX_ADMIN_PASSWORD | A new private password with at least 12 characters |
| DESTINEX_ADMIN_NAME | Optional; defaults to DESTINEX Admin |

Use a unique password that is not used for GitHub or another account. The first API request creates the administrator in the database. Do not add these values to GitHub.

New visitors can create traveller or guide accounts. A guide profile remains pending until the administrator reviews it. There are no preloaded public demo accounts or sample guide profiles on the live database.

## Enable password reset emails

Password reset links are sent through Resend. The token is one-use, expires after 30 minutes, and is stored hashed. Completing a reset signs the account out of existing sessions. Netlify applies the added password-reset database migration as part of deployment.

1. In Resend, verify a domain you control and create an API key with permission to send email.
2. In Netlify, open **Project configuration → Environment variables** and add these for the **Production** context:
   - `RESEND_API_KEY`: the private Resend API key.
   - `DESTINEX_EMAIL_FROM`: a sender on the verified domain, such as `DESTINEX <no-reply@your-domain.com>`.
3. Trigger a production deploy after saving the variables.
4. Open DESTINEX, choose **Sign in → Forgot your password?**, enter the account email, and use the link sent to that inbox.

Keep the API key in Netlify only; do not commit it to GitHub or share it in chat. The forgot-password page gives the same confirmation whether or not an account exists for the address.

## Free plan note

Netlify's Free plan has a monthly credit limit. Functions and database compute and bandwidth use credits, and projects can pause when the plan limit is reached. Check the Netlify Usage page after launch.

Payments are still clearly labelled demo payments. The app does not collect payment details or transfer money. Guide approval is an in-app review, not a background or identity check.

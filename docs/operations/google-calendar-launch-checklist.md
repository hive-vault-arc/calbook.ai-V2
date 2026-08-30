# Google Calendar and Google Meet launch checklist

CalBook.ai uses one Google OAuth web-client configuration for Google Calendar and Google Meet. Google Meet is created through the connected Google Calendar credential; it does not need a second callback URL or a separate user API key.

## Required configuration

Set `NEXT_PUBLIC_WEBAPP_URL` to the canonical HTTPS application URL and set `GOOGLE_API_CREDENTIALS` to the downloaded OAuth web-client JSON through the deployment platform's secret manager. Do not commit that JSON or put it in an example file.

For a production URL of `https://app.example.com`, register this exact authorized redirect URI in Google Cloud:

```
https://app.example.com/api/integrations/googlecalendar/callback
```

If Google sign-in is enabled as well, register this additional redirect URI and set `GOOGLE_LOGIN_ENABLED=true`:

```
https://app.example.com/api/auth/callback/google
```

For local development, use `http://localhost:3000` in both URLs. Do not mix local and production URLs in `NEXT_PUBLIC_WEBAPP_URL`; OAuth redirects are derived from that setting.

Enable the Google Calendar API and request only the scopes used by the integration:

- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/calendar.readonly`
- `https://www.googleapis.com/auth/userinfo.profile`

The profile scope is used only to update a connected user's profile image when consent is granted.

## Consent-screen checklist

1. Set the app name, support contact, developer contact, privacy-policy URL, and terms-of-service URL to CalBook.ai's final public values.
2. Choose the intended audience. While the OAuth app is in testing, add every test account explicitly; before public launch, complete the provider's required publishing or verification steps for the requested scopes.
3. Confirm the production redirect URI exactly matches the URL above, including the `https` scheme and no trailing slash.
4. Keep the OAuth client secret solely in the deployment secret manager and rotate it if it has been shared outside that boundary.

## End-to-end release check

1. Sign in as a test organizer and connect Google Calendar from Installed Apps.
2. Confirm the organizer's primary calendar becomes selected in CalBook.ai.
3. Create a Google Meet event type, make a booking with a second test account, and confirm the event appears in both calendars with a working Meet link.
4. Cancel or reschedule it and confirm the Google Calendar event updates accordingly.
5. Disconnect the calendar, verify future availability no longer reads that calendar, then reconnect once to ensure a fresh credential works.

Record the organizer account, booking UID, timestamp, and result in the release decision record. Do not record OAuth tokens or client secrets.

# Sign-in and workspace access

A configured member signs in, retains access after reload, and signs out. Anonymous users and nonmembers cannot read workspace data.

## Sub-features

- `auth-entry` reaches login from public and protected entries.
- `auth-login` submits credentials through the UI.
- `auth-refresh` retains membership after reload.
- `auth-logout` removes workspace access.
- `auth-nonmember` denies the seeded outsider.

## How to get to it (user POV)

- Open `/` and choose **Open workspace**.
- Open `/workspace`, `/workspace/chat`, or another protected URL while signed out.
- Open `/login` directly.
- Choose **Sign out** in the sidebar. On mobile, open **Toggle Sidebar** first.

## Driving it with Playwright

Preconditions: basic seed succeeded; demo credentials are available from the environment. No model is required.

- Run `.agents/skills/verify-memoba/run.mjs` for the shipped protected-route, UI login, Doctor, refresh, and logout proof.
- For the landing entry, `await page.goto('/')`, then `await page.getByRole('link', { name: 'Open workspace' }).click()`. Require `/login` and heading **Sign in** in an anonymous context.
- Fill `getByLabel('Email', { exact: true })` and `getByLabel('Password', { exact: true })` from the environment. Click the button **Sign in**. Require heading **What are you working on?**.
- GET `/api/workspace` with `page.request.get`. Require 200, `no-store`, and the seeded workspace ID from Doctor. Reload and require the same access.
- Click the button **Sign out**. Require `/login` and 401 from `/api/workspace`.
- In a fresh context, submit `outsider@memoba.local` and the demo password through the same UI. Require the text **Workspace unavailable for this account.** and 401 from `/api/workspace`. `tests/e2e/foundation.spec.ts` also asserts 404 from the real login API for this account.
- Capture the empty login form, authenticated page after refresh, and empty form after logout. Never capture filled credentials.

## Gotchas

- Seed updates existing demo and outsider passwords to DEMO_PASSWORD. Attempt login before seeding an existing stack; do not reset accounts merely to hide a setup mismatch.
- The shipped proof covers landing, protected workspace and chat, direct login, refresh, mobile logout, and outsider denial. Desktop logout can be checked in a separate drive.
- A responding login page does not prove usable membership. Require the authenticated Doctor.

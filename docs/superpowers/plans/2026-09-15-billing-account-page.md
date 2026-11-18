# Billing account page

Rebuild `/billing` as a typical SaaS account billing page. Keep Stripe checkout, portal, and capacity levers. Do not restyle the conversion landing.

## Product

- Coach org admins see **plan, usage, payment, invoices** on one page that sits in the workspace next to Studio settings.
- Change plan stays behind a CTA (`?view=change`). Stripe portal remains the place for card, invoices, and cancel.
- Internal orgs (`metadata.isInternal`) show **Free / £0** with no checkout push.
- Drop the marketing hero, fake TODAY/SOON timeline, branding upsell block, and AI-credit usage copy.

## IA

- Canonical in-app route: `/dashboard/billing` (same chrome as Studio settings).
- Keep `/billing` as a redirect (Stripe cancel URLs and emailed links).
- `/billing/success` stays a confirmation page.

## Implementation

- Parse org billing from the Firestore org doc in a pure helper (tests).
- Overview is white `rounded-lg` cards on workspace grey; Settings-style breadcrumb + title.
- Change-plan view keeps existing levers; quieter chrome; no AI scans meter.

## Out of scope

- New Stripe products, webhooks, or pricing catalog.
- Merging billing into a Settings tab.
- Owner console.

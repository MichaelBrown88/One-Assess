# One Assess

One Assess is the assessment app for fitness coaches. A coach adds a client, runs a baseline assessment, and produces an AXIS report.

## Stack

React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Firebase (Firestore, Cloud Functions, Hosting), and MediaPipe.

## Develop

Node 22. From the repo root:

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm run test:ci
npm run build
```

Cloud Functions:

```sh
cd functions && npm ci && npm run build
```

Copy `functions/.env.example` to `functions/.env` for local function runs. Do not commit values.

## Deploy

Rules, Cloud Functions, and the app must ship together when they change together. Use:

```sh
firebase deploy
```

`npm run deploy:preview` and `deploy-preview.sh` publish hosting only. Do not use them when `firestore.rules` or `functions/` changed, or when the client-erasure function and its org screen changed. Split deploys break coach reads or leave erasure half-shipped. See `CLAUDE.md`.

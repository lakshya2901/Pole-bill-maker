# Pole Invoice & Transport (TC) Bill Maker

Vite front-end + Vercel serverless API (`/api`) + Neon Postgres.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL` (Neon).
3. `npm run dev` (uses `vercel dev`, so `/api` works locally). `npm run dev:ui` runs the UI only.
4. Tables are created automatically on the first API call (or run `npm run db:setup`).

## Deploy on Vercel
1. Push this folder to GitHub and import it in Vercel (framework: Vite — preset detected).
2. Project Settings → Environment Variables: add `DATABASE_URL`.
3. Deploy. There is no login.

Never commit `.env.local` (it is git-ignored).

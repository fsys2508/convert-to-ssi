# Convert to SSI

Import dive logs from supported devices (e.g. Garmin .fit) and upload to the SSI app via QR code.

## Stack

- **Frontend & API:** Next.js 14 (App Router)
- **Deploy:** Vercel (serverless)

## Structure

```
convert-to-ssi/
├── app/
│   ├── api/
│   │   └── upload/
│   │       └── route.ts   # POST: accept .fit, return QR / SSI data
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx           # Upload UI + QR display
├── public/
├── next.config.mjs
├── package.json
├── tsconfig.json
└── README.md
```

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

```bash
vercel
```

Or connect the repo in the Vercel dashboard.

## Supported sources

- **Garmin:** .fit files (FIT SDK).
- Open for other wishes
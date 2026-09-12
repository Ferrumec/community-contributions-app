# Community Contributions Platform

A mobile-first frontend prototype for a Chama/Sacco-style community
contributions platform. Built with React, Vite, Tailwind CSS, and Recharts.

## How the data works

This is a **standalone frontend** — there is no backend server. Mock data
lives at `public/mock-data/db.json` and is fetched over HTTP at runtime
(`fetch('/mock-data/db.json')` in `src/App.jsx`), the same way the app would
call a real API. This keeps data and UI code decoupled:

- Edit `public/mock-data/db.json` to change communities, members,
  contributions, or spendings — no code changes needed.
- To point the app at a real backend later, change `MOCK_DATA_URL` at the
  top of `src/App.jsx` to your API endpoint (and add `POST`/`PATCH` calls
  in the mutation handlers, which currently only update local React state).

Actions like verifying a contribution, adding a contribution, or
approving/rejecting a spending only update in-memory state — refreshing the
page resets to the JSON file's contents, since there's no server to persist
writes to.

## Getting started

```bash
npm install
npm run dev
```

Visit the local URL Vite prints (usually `http://localhost:5173`).

## Building for production

```bash
npm run build
```

This outputs a static site to `dist/` (Vite automatically copies
`public/mock-data/db.json` into `dist/mock-data/db.json`).

Preview the production build locally:

```bash
npm run preview
```

## Deploying

The build output in `dist/` is a fully static site — deploy it anywhere
that serves static files:

- **Vercel**: `vercel deploy` (or connect the repo in the Vercel dashboard;
  build command `npm run build`, output directory `dist`)
- **Netlify**: `netlify deploy --prod --dir=dist` (or connect the repo;
  build command `npm run build`, publish directory `dist`)
- **GitHub Pages / any static host**: upload the contents of `dist/`

Because routing is implemented with the URL hash (`#/community/:id`, etc.),
no special server-side rewrite rules are needed for deep links — it works
on any static host out of the box.

## Project structure

```
├── public/
│   └── mock-data/
│       └── db.json        # Mock backend data, served as a static asset
├── src/
│   ├── App.jsx             # All pages, components, and routing logic
│   ├── main.jsx             # React entry point
│   └── index.css            # Tailwind directives + fonts
├── index.html
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── package.json
```

## Demo user

The prototype is logged in as **Wanjiru Kamau** (`m1`), who is Treasurer of
"Kilimani Wanawake Chama" and a regular Member of "Tech Hustlers Sacco" —
useful for seeing both the Treasurer view (Verify/Reject/Approve actions)
and the regular Member view side by side. Change `CURRENT_USER_ID` in
`src/App.jsx` to view the app as someone else.

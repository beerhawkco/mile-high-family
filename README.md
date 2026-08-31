# Mile High Family

Public Colorado Front Range site for [milehighfamily.com](https://milehighfamily.com).

Camping, rockhounding, gymnastics, aviation, and gaming — plus adventures, weekend plans, short lessons, and a garage that tracks two vehicles.

## Local

```sh
npm install
npm run dev
```

Dev server: `http://localhost:4321`

```sh
npm run build
npm run preview
```

If you are still inside the old `mimg-it-oc` repo, run those from `sites/mile-high-family/`.

## Content

MDX collections live in `src/content/`:

- `camping`, `rockhounding`, `gymnastics`, `aviation`, `gaming`
- `adventures`, `fun`, `lessons`

Frontmatter: `title`, `summary`, `date`, `tags`, `ages`, `hero`, `heroAlt`, optional `heroCredit`, `featured`, `weekend`.

Launch stories are starter editorial. Place photos are free Wikimedia Commons files of the actual spots. Dark mode toggle lives in the header.

## Garage

Public market notebook at `/garage` for:

- 2019 Thor Majestic 28A
- 2024 Tesla Model Y Long Range

The admin desk is `/garage/desk`. It is a **username and password** login. There is no GitHub personal access token in the browser.

Local defaults (override with `.dev.vars` or env):

- Username: `admin`
- Password: `front-range-garage`

`src/content/garage/store.json` is the notebook. Saving from the desk in `npm run dev` writes that file. A daily GitHub Action (`garage-daily.yml`, 7:15am Denver) carries yesterday’s numbers forward so the date does not go stale — then edit comps and sentiment from the desk.

Production (Cloudflare Worker secrets, never pasted in the UI):

- `GARAGE_ADMIN_USER`
- `GARAGE_ADMIN_PASSWORD`
- `GARAGE_SESSION_SECRET` (at least 16 characters)
- Optional: KV namespace bound as `GARAGE` for instant saves
- Optional: `GARAGE_GITHUB_TOKEN` so the Worker can commit `store.json` without anyone pasting a token

```sh
npm run garage:seed    # rebuild starter comps
npm run garage:pulse   # carry yesterday forward locally
```

## Campfire

Private social desk at `/campfire` (same device lock as `/cairn`). Plan captions, YouTube scripts, and branded cards for the blog, YouTube, Facebook, Instagram, and X. The queue lives as JSON in `src/content/campfire/` so more than one person can share it. It is blocked from search engines and is not in the public nav.

## Cloudflare

The site is a static Astro build uploaded as Worker assets. [`wrangler.jsonc`](wrangler.jsonc) points at `./dist` and runs `npm run build` before `wrangler deploy` / `wrangler versions upload`.

Workers Builds (this repo’s CI):

- Production branch: `main`
- Build command: leave empty (Wrangler runs `npm run build`)
- Deploy command: `npx wrangler deploy`
- Preview / non-production: `npx wrangler versions upload`

Local upload after `npm run build`:

```sh
npx wrangler versions upload
```

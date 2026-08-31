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

Private selling notebook at `/garage` (not in the public nav, blocked from search). One admin login:

- Username: `admin`
- Password: `front-range-garage`

Summary shows both units. **Cars** and **RVs** are separate sections. Desk is `/garage/desk`.

The daily job (`garage-daily.yml` and the Worker cron) pulls live asking listings inside **250 miles of Denver** (Tesla used inventory + Denver Craigslist RSS for the Majestic), infers sold prints when a listing disappears, and records days listed before sale. If a fetch fails, yesterday’s numbers carry forward.

```sh
npm run garage:seed
npm run garage:pulse
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

# Mile High Family

Public Colorado Front Range site for [milehighfamily.com](https://milehighfamily.com).

Camping, rockhounding, gymnastics, aviation, and gaming — plus adventures, weekend plans, and short lessons.

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

## Cloudflare Pages

Connect this GitHub repo in Cloudflare → Workers & Pages → Create → Pages.

- Production branch: `main`
- Framework preset: Astro
- Root directory: leave empty
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `NODE_VERSION` = `22`

After the first `*.pages.dev` URL works, add the custom domain `milehighfamily.com`.

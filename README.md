# Tech-Vedha-Admin

The CMS behind the Tech Vedha website (`../Tech-Vedha-frontend`). It is the JMT admin
(github.com/rishabh-registerkaro/jmt-admin) configured for Tech Vedha: same login, roles, media
library, SEO & Scripts, leads, preview and cache refresh. Only the content model and branding changed.

## How the website reads its content

- Every editable page is one JSON document in the `jmt_site_pages` table, edited at
  **Dashboard → Content → …** (`app/dashboard/site-pages/[key]`). The keys are listed in
  `app/lib/content/site-pages.ts`:

  | Key | Dashboard item | What it controls on the website |
  |---|---|---|
  | `site` | Site & Menus | Brand name, tagline, description, email, phone, WhatsApp, header and footer links |
  | `home` | Homepage | Security layers, process steps, quality gates, client stories, FAQ, promises |
  | `about` | About Us | Hero facts and tags, vendor comparison, audiences, the service loop, principles, mission, vision |
  | `contact` | Contact | Company details, contact rows, form timeframes, channels, next steps |
  | `services` | Services → Service Catalogue | The four services (titles, summaries, offerings) used across the site |
  | `service-apps`, `service-marketing` | Services → App Development / Digital Marketing | Everything on each service page |

- The schema and default content of each page is `data/siteContentDefaults.json`, generated from the
  website's own data (`Tech-Vedha-frontend/lib/content/registry.ts`). After changing anything in the
  website's `data/` or `lib/site.ts`, run **`npm run sync:defaults`** here.
- The website fetches `GET /api/site-pages/client/<key>` and merges the saved document over its bundled
  copy (`lib/sitePages/mergeContent.ts`, identical in both projects). If the admin is down or nothing is
  saved, the website shows its bundled copy, so it never breaks.
- Fields tied to code (ids, slugs, icons, illustrations, tech-stack logos, story card types) are `locked`:
  they are hidden in the editor and the lists that contain them keep their length. The locked paths must
  match in both registries.
- Saving a page calls the website's `POST /api/revalidate` (shared `REVALIDATE_SECRET`), so changes are
  live on the next visit. **Preview** shows unsaved edits through the website's `/api/preview`.
- Headlines written directly in the website's components (not in its `data/` files) are not editable here.

### Leads

The homepage "Let's talk" form and the Contact page form post to `/api/lead/homepage` and
`/api/lead/contact` through a Server Action on the website (shared secret, rate limits, email alert:
`app/lib/server/enquiryLead.ts`). They appear under **Leads**. If the admin can't be reached, the website
falls back to opening the visitor's email app, as before.

### Not used by Tech Vedha

The JMT homepage, JMT service pages, site menus, Join Our Crew / Applications and the legacy main-website
editors (blog, packages, about, contact, header/footer menu, terms) are still in the code but not linked
in the sidebar, and their permissions are hidden in the Roles UI.

## Requirements

- **Node.js 20.9 or newer** (Next.js 16 needs it) and npm
- **MySQL 8** (local or Hostinger)
- Optional: a Gmail account with an App Password (password-reset codes and new-lead emails)
- Optional: Hostinger FTP access (image uploads in the dashboard)

## Quick start

```bash
git clone https://github.com/rishabh-registerkaro/jmt-admin.git
cd jmt-admin
npm install                 # also runs `prisma generate`
cp .env.example .env        # then fill it in (see "Environment variables" below)
```

### Database

**If you're using the existing (shared) database**, put its `DATABASE_URL` in `.env` and skip to `npm run dev`. Don't push schema changes to it unless you mean to.

**If you're starting with a new, empty database:**

```bash
# .env → DATABASE_URL="mysql://user:password@localhost:3306/tech_vedha_cms"

npm run db:push             # creates every table from prisma/schema.prisma
npm run seed:admin -- --email you@example.com --username admin --password "a-strong-password"
npm run seed:homepage       # fills the homepage editor with the default content
```

The About, Contact and Join our crew pages need no seeding. Until they're saved from the dashboard, the website shows their bundled copy, and the editor opens pre-filled with it.

Public signup is disabled, so `seed:admin` is how you get the first login. After that, create more users from **Dashboard → Users**.

### Run

```bash
npm run dev                 # http://localhost:3000 → redirects to /login
```

To see the website too, run [`Tech-Vedha-frontend`](../Tech-Vedha-frontend) on port 3002 (`npm run dev` there). Give it the same `REVALIDATE_SECRET`. Every link between the two apps is mapped in [LINKING.md](LINKING.md).

---

## Environment variables

`.env.example` is the template, and each value is explained there. Never commit `.env`.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | **yes** | MySQL connection string: `mysql://USER:PASSWORD@HOST:3306/DB?connection_limit=5`. URL-encode special characters in the password (`@` → `%40`, `#` → `%23`). |
| `JWT_SECRET` | **yes** | Signs login tokens. Use a long random string (`openssl rand -hex 32`). |
| `REVALIDATE_SECRET` | for the website | Shared secret. It must be the **same value** in `Tech-Vedha-frontend/.env`. It guards cache refreshes, draft previews and the enquiry form endpoints, and it lets the lead rate limit see real visitor IPs. |
| `PRODUCTION_URL` | for the website | The website's origin again. Used for CORS and as a second cache-refresh target (skipped when it equals `FRONTEND_URL`). |
| `FRONTEND_URL` | for the website | Origin of Tech-Vedha-frontend (default `http://localhost:3002`). Cache-refresh calls go here. |
| `NEXT_PUBLIC_FRONTEND_URL` | for the website | The same URL, for the editors' "View live" and **Preview** links. It's baked in at **build** time. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | for email | SMTP settings. Gmail: use `smtp.gmail.com:587` and an [App Password](https://myaccount.google.com/apppasswords), not the normal password. |
| `ADMIN_NOTIFY_EMAIL`, `NOTIFY_CC_EMAIL` | for lead alerts | Where new-lead emails go. The CC is optional. |
| `HOSTINGER_FTP_HOST`, `HOSTINGER_FTP_USER`, `HOSTINGER_FTP_PASS`, `HOSTINGER_FTP_PORT` | for uploads | FTP account from Hostinger → Files → FTP Accounts. The host has no `ftp://` prefix. |
| `HOSTINGER_MEDIA_PATH`, `HOSTINGER_MEDIA_URL` | for uploads | Server folder for uploaded files (default `/public_html/tech-vedha/media`, kept separate from other projects on the same FTP account), and the public URL of that folder. |
| `HOSTINGER_APPLICATIONS_PATH` | optional | Private folder (outside `public_html`, default `/tech-vedha/applications`) for CVs sent with Join our crew applications. |
| `HOSTINGER_FTP_SECURE`, `HOSTINGER_FTP_TLS_HOSTNAME`, `HOSTINGER_FTP_TLS_INSECURE` | optional | FTPS settings. An IP host is verified against `hstgr.io` by default; `TLS_INSECURE=true` disables verification (see `.env.example`). |

Without the optional groups the app still runs. Only the matching feature fails: password reset and lead emails without SMTP, image uploads without FTP.

**Hostinger MySQL from your laptop:** add your IP under hPanel → Databases → **Remote MySQL** first. Keep `connection_limit=5`, because Hostinger caps concurrent connections.

Check the SMTP settings before deploying with `npm run test:smtp` (auth only) or `npm run test:smtp -- you@gmail.com` (sends a test email).

---

## Roles and permissions

Access depends on the user's **role**. A role is a named set of **permissions**. Permissions are listed in `app/lib/constants/permissions.ts`, and roles are stored in the `jmt_admin_roles` table. A Super Admin manages roles at **Administration → Roles** and assigns them at **Administration → Users**.

| Permission | Allows |
|---|---|
| `content.edit` | Homepage, About / Contact / Join Our Crew pages, header and footer menus, Terms & Policy |
| `posts.manage` | Posts and categories |
| `services.manage` | Service pages |
| `packages.manage` | Packages |
| `media.manage` | Media library (anyone with a content permission can still upload images from inside an editor) |
| `seo.manage` | SEO & Scripts: structured data (JSON-LD), site-wide and per page |
| `seo.scripts` | SEO & Scripts: the Google Tag Manager ID and custom script snippets. These run code on the live website, so give it only to trusted admins |
| `leads.view` / `leads.manage` | See client enquiries / change status, edit, add and delete them |
| `applications.view` / `applications.manage` | See Join Our Crew worker applications / change status and delete them |
| `users.manage` | Users: create, change role, reset password, delete |
| `cache.reset` | The "Reset all cache" button |
| `roles.manage` | The Roles page. Only the Super Admin role has it, and it can't be given to any other role. |

The built-in roles are created by `npm run seed:roles`:

| Role | Permissions | Notes |
|---|---|---|
| **Super Admin** | everything | Locked. Can't be edited or deleted. |
| **Admin** | everything except `roles.manage` | Permissions can be edited; can't be deleted |
| **Editor** | content, posts, services, packages, media, `seo.manage` | Contributors were merged into this role |
| **Leads Manager** | leads and applications (view and manage) | |

You can add your own roles, such as "Recruiter" with only the applications permissions.

**After adding a new permission** (such as `seo.manage` / `seo.scripts`): `npm run seed:roles` refreshes only the Super Admin role, so existing Admin and Editor roles don't get it automatically. A Super Admin ticks it on those roles in **Administration → Roles**: `seo.manage` + `seo.scripts` for Admin, `seo.manage` for Editor.

**Rules enforced by the API** (`app/lib/server/rbac.ts`):
- There is exactly one Super Admin account. Nobody can give someone the Super Admin role.
- Only the Super Admin can give someone a role that includes `users.manage` (such as Admin). So only the Super Admin can create admins.
- Anyone else can only assign roles whose permissions they hold themselves.
- You can only change the role or password of, or delete, users whose role you could assign yourself.
- Nobody can change their own role.
- The Super Admin account can't be deleted or demoted, and only its owner can change its password.
- A built-in role can't be deleted. A custom role can be deleted only once no users have it.

**Legacy `users.role` column.** The `users` table is shared with the Global Elite site, so its `role` enum column stays. It is kept in sync: `superadmin`, `admin`, or `editor` for every other role. If a user has no `roleId` (for example, an account created by the Global Elite site), their access comes from that column: superadmin → Super Admin, admin → Admin, editor or contributor → Editor.

### Admin site map

Each page is listed in `app/lib/constants/routeAccess.ts` and each sidebar item in `components/common/AppSidebar.tsx`. Sidebar items, and the items inside each menu, only appear for users with the permission. The API behind each page checks the permission again on the server.

```
Dashboard                      /dashboard                               signed in (cards filtered per permission)
CONTENT
├─ Site & Menus                /dashboard/site-pages/site               content.edit
├─ Homepage                    /dashboard/site-pages/home               content.edit
├─ About Us                    /dashboard/site-pages/about              content.edit
├─ Contact                     /dashboard/site-pages/contact            content.edit
├─ Services ▸ Catalogue        /dashboard/site-pages/services           content.edit
│           ▸ App Development  /dashboard/site-pages/service-apps       content.edit
│           ▸ Digital Mktg     /dashboard/site-pages/service-marketing  content.edit
├─ Media Library               /dashboard/media                         media.manage
└─ SEO & Scripts               /dashboard/seo[?scope=/path]             seo.manage or seo.scripts
LEADS
└─ Leads                       /dashboard/leads                         leads.view
ADMINISTRATION
├─ Users                       /dashboard/users                         users.manage
└─ Roles                       /dashboard/roles                         roles.manage
ACCOUNT
└─ Profile                     /dashboard/profile                       signed in
Sidebar footer: Reset all cache                                         cache.reset
```

These pages work by URL but have no sidebar link. Posts and Packages only feed the main website, not Joy Maa Tara, so they are left out of the sidebar, the dashboard home and the Roles screen. Their pages and APIs still exist because the main website reads its blog and package blocks from this backend.

| Page | Permission |
|---|---|
| `/dashboard/blog/*` (Posts and categories, main website only) | `posts.manage` |
| `/dashboard/services/[id]` | `services.manage` |
| `/dashboard/packages/*` (package blocks, main website only) | `packages.manage` |
| `/dashboard/site-pages/[key]` | `content.edit` |
| `/dashboard/header-menu`, `/dashboard/footer-menu`, `/dashboard/about`, `/dashboard/contact` (older main-website editors) | `content.edit` |

A dashboard page not listed in `routeAccess.ts` is open to any signed-in user.

**API permissions.** Admin APIs use `requirePermission(req, …)` from `app/lib/utils/authorization.ts`. A GET on a content API (used by pickers in other editors) accepts any content permission. Writes need the specific permission. Public endpoints are unaffected: `*/client/*`, sitemaps, `/api/lead/{homepage,contact,join}`, public `POST /api/lead`, `/api/preview/[token]`, login, forgot-password, and the public GETs of header-menu, footer-menu, about and contact.

**Applications.** Join Our Crew applications are stored as leads with `leadSource = JOIN_LEAD_SOURCE` (`utils/joinForm.ts`). `/api/applications` lists them; `/api/lead` and the Leads page leave them out. On the Applications page, the statuses `converted` and `lost` are shown as **Hired** and **Rejected**.

### Turning RBAC on (first deploy)

1. `npx prisma db push` adds the `jmt_admin_roles` table and a nullable `users.roleId` column, and changes nothing else. Run it **before** starting the new code. The old code ignores the new column, but the new code needs it.
2. `npm run seed:roles` creates the four built-in roles and links every existing user to the one matching their old role (contributors become Editors). You can run it again safely.
3. Deploy or restart the admin.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | `prisma generate` + production build |
| `npm start` | Serves the production build on port 3000 |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript checks |
| `npm run db:push` | Syncs `prisma/schema.prisma` to the database. It refuses changes that would lose data unless you confirm. |
| `npm run db:studio` | Prisma Studio, a GUI to browse the data |
| `npm run seed:admin -- --email … --username … --password …` | Creates the Super Admin, and the built-in roles if they're missing. It does nothing if a Super Admin already exists, and never overwrites an existing user. |
| `npm run seed:roles` | Creates the built-in roles and links existing users to them. Safe to run again. |
| `npm run seed:homepage` | Fills the homepage editor with default content. Add `-- --force` to overwrite. |
| `npm run test:smtp` | Checks the SMTP credentials |

Other one-off seeders live in `prisma/` (`seed-menus.ts`, `seed-about.ts`, `seed-service-pages.ts`, `seed-blog-posts.ts`). They **overwrite** live main website content. Only run them (`npx tsx prisma/<file>.ts`) against an empty database.

### Schema changes

There's no `prisma/migrations` folder. The database is managed with `prisma db push`. To preview a change before applying it:

```bash
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script
```

Don't run `prisma migrate dev` against the shared database. It would try to reset it.

---

## Project structure

```
app/
  api/                 REST API (route handlers)
    */client/*         public read endpoints used by the websites (CORS)
    homepage/          homepage CMS: admin CRUD, /client bundle, /version
    jmt-services/      JMT service pages: admin CRUD, /client/<slug>
    site-pages/        JMT About / Contact / Join our crew: [key] (GET, PUT, DELETE = reset), /client/[key]
    lead/              form endpoints for jmt-frontend (homepage, contact, join); admin list of enquiries
    applications/      Join Our Crew worker applications (list, status, delete)
    roles/             roles CRUD (Super Admin)
    users/             users CRUD
    preview/           POST: store an unsaved draft; [token]: draft read by jmt-frontend (shared secret)
  dashboard/           admin UI pages (one folder per section)
    services/          JMT service pages: list (services-list.tsx) and editor ([id])
    site-pages/[key]/  About / Contact / Join Our Crew editor
  robots.ts            Disallow: / (the admin is never indexed)
  login/ forgot-password/ signup/
  lib/
    config/            Prisma client (db.ts), email (SMTP)
    constants/         permissions.ts (permissions + built-in roles), routeAccess.ts (page → permission)
    content/           default content and templates for each CMS section
                       (site-pages.ts: registry of the About / Contact / Join pages)
    server/            shared helpers for the JMT service and site page routes, previewStore.ts (drafts), rbac.ts (roles)
    utils/             auth, CORS, revalidation, serialization, media helpers, leadThrottle.ts (spam limits)
  types/               dashboard types
components/
  ui/                  shadcn/ui primitives
  common/              shared dashboard components (sidebar, editor, media picker, …)
  homepage-editor/     section editors for /dashboard/homepage (their field components are reused)
  jmt-service-editor/  section editors for the service pages
  site-page-editor/    generic editor for About Us, Contact and Join Our Crew
hooks/                 React hooks (route permissions via PermissionsProvider, mobile, useDraftPreview for the Preview button)
lib/                   axios API clients used by the dashboard
lib/homepage/          homepage view-model builder (shared with jmt-frontend)
lib/service/           service page normalizer (shared with jmt-frontend)
lib/sitePages/         mergeContent.ts: saved site page over bundled copy (shared with jmt-frontend)
server/homepage.ts     cached homepage reads for GET /api/homepage/client
types/ data/ utils/    types, bundled default content, form rules (shared with jmt-frontend)
prisma/                schema.prisma and seed scripts
scripts/               maintenance scripts (SMTP test)
public/                bundled default images for the editor previews (homepage/, service/, about/, join/, contact/);
                       proxy.ts lets them through without a login
proxy.ts               auth gate: redirects to /login when not signed in
next.config.ts         security headers (noindex, HSTS, no framing), Vercel production env check
```

### Contract with Tech-Vedha-frontend

These must stay in step with the website. The full list, with both file paths for each, is in [LINKING.md](LINKING.md):

- `lib/sitePages/mergeContent.ts` is **identical** to the website's `lib/content/mergeContent.ts`.
- `app/lib/content/site-pages.ts` has the same keys and `locked` paths as the website's `lib/content/registry.ts`.
- `data/siteContentDefaults.json` is **generated** from the website: run `npm run sync:defaults` after changing its `data/` or `lib/site.ts`.
- `TOKEN_PATTERN` in `app/lib/server/previewStore.ts` matches `PREVIEW_TOKEN_PATTERN` in the website's `lib/preview.ts`.
- `HONEYPOT_FIELD` in `app/lib/server/enquiryLead.ts` matches the website's `components/ui/Honeypot.tsx`, and the form field names match `handleEnquiry`.
- Cache tags `jmt-page-<key>` and `jmt-seo` match the website's `contentTag` and `SEO_TAG`.

The JMT-era shared files (`lib/homepage/*`, `lib/service/*`, `utils/*Form.ts`, `data/about.ts`, …) are not used by the Tech Vedha website.

---

## Deployment

### Pre-deploy checklist

1. **Checks pass locally.** Run `npm run typecheck` and `npm run build`. `next build` doesn't run ESLint, and the existing `no-explicit-any` lint errors don't block a deploy.
2. **Production `.env` values are set on the host** (see [Environment variables](#environment-variables)):
   - `DATABASE_URL`: the production MySQL, with `?connection_limit=5`.
   - `JWT_SECRET`: a new random value. Don't reuse the dev one. Changing it signs everyone out.
   - `REVALIDATE_SECRET`: the same value as in Tech-Vedha-frontend's production env.
   - `PRODUCTION_URL` and `FRONTEND_URL`: the real `https://` origins, with no trailing slash.
   - `NEXT_PUBLIC_FRONTEND_URL`: set **before the build**.
   - The SMTP and FTP groups. Test SMTP with `npm run test:smtp -- you@gmail.com`.
3. **Serve the admin over HTTPS.** In production the `authToken` cookie is `Secure`. Over plain `http://` the browser drops it, and login looks like it succeeds but sends you straight back to `/login`.
4. **The database is ready.** On the shared production database, apply schema changes only after you preview them (see [Schema changes](#schema-changes)). On a new database, run `db:push` and `seed:admin` once (`seed:homepage` only fills the unused JMT homepage table).
5. **Deploy Tech-Vedha-frontend after this app.** It reads `/api/site-pages/client/<key>` and `/api/seo/client` from here. If the admin is down it still builds, but with its bundled copy until the next refresh.
6. **Run the smoke tests after deploying:**
   - `/login` signs in.
   - Saving **Homepage**, **About Us**, **Contact**, **Site & Menus** or a **Services** page shows up on the website within a few seconds.
   - **Preview** in an editor opens the site with the unsaved change and a preview bar.
   - An image upload in **Dashboard → Media** works.
   - A test lead from the homepage form appears in **Dashboard → Leads** with its page in **Source**, and sends the alert email.
   - `/robots.txt` answers `Disallow: /`.

### Node host (e.g. Hostinger Node.js app)

```bash
npm ci
npm run build      # prisma generate + next build
npm start          # listens on port 3000
```

- Set the environment variables in the host's dashboard before you run the build, because `NEXT_PUBLIC_FRONTEND_URL` is baked in at build time.
- Use Node 20.9 or newer.
- `next.config.ts` pins `experimental.cpus: 2`. Hostinger containers report the host's full CPU count, and without the pin the build crashes while spawning workers.
- If the host gives you a different port, change `-p 3000` in the `start` script, or put a reverse proxy in front.

### Vercel

- Import the repo and add the environment variables in **Project → Settings → Environment Variables** before the first build.
- A **production** build fails on purpose if `DATABASE_URL`, `JWT_SECRET`, `REVALIDATE_SECRET`, `FRONTEND_URL` or `NEXT_PUBLIC_FRONTEND_URL` is missing, or if any of them except `DATABASE_URL` points at localhost (`next.config.ts`). Preview builds aren't checked.
- Vercel rejects request bodies over 4.5 MB, so uploads are capped at **4 MB** there (25 MB elsewhere). Compress large images first.
- The database must accept connections from outside (Hostinger → **Remote MySQL**). Vercel's IPs change, so that usually means allowing any host (`%`). Keep `connection_limit=5`.
- The lead IP limit and draft previews are in memory, so on Vercel they are per function instance (best effort). The per-email/phone lead limit is in MySQL and always applies.

### Updating a running deployment

```bash
git pull
npm ci
npm run build
# restart the process (pm2 restart jmt-admin / host's "Restart" button)
```

If `prisma/schema.prisma` changed, preview the change and apply it with `npm run db:push` **before** restarting.

## Troubleshooting

- **`EPERM … query_engine-windows.dll.node` during `npm install` / `prisma generate`.** On Windows, a running `npm run dev` locks the Prisma engine. Stop the dev server and run `npx prisma generate` again.
- **npm 11 asks to approve install scripts.** `package.json` → `allowScripts` already approves the ones this project needs (Prisma, bcrypt, esbuild). If you upgrade one of those packages, approve the new version with `npm install-scripts approve <pkg>`.
- **Login says "Invalid credentials" on a new database.** No user exists yet. Run `npm run seed:admin`.
- **Login works locally but loops back to `/login` in production.** The site is served over plain HTTP, so the browser drops the `Secure` auth cookie. Serve it over HTTPS.
- **The "View live" button opens localhost in production.** `NEXT_PUBLIC_FRONTEND_URL` wasn't set at build time. Set it and rebuild.
- **Edits don't show on the website.** Check that `FRONTEND_URL` points at it and that `REVALIDATE_SECRET` matches in both `.env` files.
- **About Us / Contact / Join Our Crew says "out-of-date database client", or `/api/site-pages/*` returns 500.** The `jmt_site_pages` table or the Prisma client is missing. Run `npm run db:push` (it only adds that table), stop the dev server, run `npx prisma generate`, and start it again.
- **The preview tab says the preview expired.** The draft is older than 2 hours, the server restarted, or the request reached another instance. Click **Preview** again. If it never works, check that `REVALIDATE_SECRET` matches in both apps.
- **A form says "Too many submissions".** The spam limit was hit (see [Leads](#leads)). It clears after 10 minutes.
- **An upload fails with "File too large" on Vercel.** The limit there is 4 MB. Resize the image first.
- **`npm run typecheck` reports missing `app/dashboard/jmt-services/...` modules.** Those are stale generated types in `.next/` from removed pages. Delete the `.next` folder and run it again.

---

## SEO & Scripts

**Dashboard → SEO & Scripts** (`app/dashboard/seo`) adds tracking and structured data to the Joy Maa Tara site without a deploy.

| What | Where it shows | Permission |
|---|---|---|
| Google Tag Manager container ID | Every page (GTM script, plus the `<noscript>` iframe right after `<body>`) | `seo.scripts` |
| Custom scripts (pasted vendor snippets) | Site-wide, or one page | `seo.scripts` |
| Schema / JSON-LD | Site-wide, or one page | `seo.manage` |

- **Use GTM for tracking.** GA4, Google Ads, Meta Pixel, Clarity and similar tags are added inside GTM. Custom scripts are for tools GTM can't handle.
- **JSON-LD is rendered on the server** into the page HTML, never through GTM, because search engines read it from the HTML.
- **Custom scripts are allow-listed.** Only top-level `<script>`, `<noscript>`, `<meta>` and `<link>` tags are accepted, with https URLs and no `on*` handlers. The snippet is parsed on save (`app/lib/content/seo.ts`) and the website renders the parsed form, never the raw text.
- **Timing.** *Early* runs before the page is interactive (`beforeInteractive`, site-wide only). *Default* runs after it is interactive. *Lazy* runs when the browser is idle.
- **Test traffic is left out.** GTM and custom scripts don't load on Vercel preview deployments or while previewing unsaved edits. JSON-LD always loads.

**Storage.** Table `jmt_seo`, one row per scope: `global`, or a page path (`/`, `/about`, `/service/<slug>`). Renaming a service slug moves its row, and deleting the service deletes it. A row whose page no longer exists is listed as **No page**.

**API.**

| Route | Purpose |
|---|---|
| `GET /api/seo` | Dashboard overview: the site-wide row and the page list |
| `GET`, `PUT`, `DELETE /api/seo/entry?scope=…` | One scope |
| `GET /api/seo/client` | Public. The whole config for jmt-frontend (`server/seo.ts`): enabled scripts only, parsed nodes only |

Every save expires the `jmt-seo` cache tag on the website.

**On the website.**
- `app/layout.tsx` renders the site-wide items.
- Each page renders its own with `<PageSeo path=… />` (`components/seo/SeoTags.tsx`).
- **A new page must add that line**, using the same path as its canonical, or its page-level SEO won't show.

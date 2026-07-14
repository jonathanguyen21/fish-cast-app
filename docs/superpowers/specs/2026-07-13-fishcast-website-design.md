# FishCast Website — Design

## Purpose

A minimal marketing/landing site for FishCast, with a public Privacy Policy page. The
immediate driver is App Store Connect, which requires a live, publicly accessible privacy
policy URL before a submission can proceed.

## Scope

New, separate repo: `fishcast-website`. Plain static HTML/CSS, no build step, no framework,
no JS beyond what's trivially needed. Not a continuation of the FishCast app's design system
— a lightweight, independent site.

Out of scope: blog, changelog, support portal, analytics, contact forms, custom domain setup
(can be added later once a domain exists).

## Hosting

GitHub Pages, served from the `main` branch root. Public repo (required for free GitHub Pages
on a personal account). Live at `https://jonathanguyen21.github.io/fishcast-website/` once
Pages is enabled in repo settings.

## Pages

- `index.html` — app name, one-line pitch, App Store badge (greyed out / non-linking
  placeholder until the app ships), link to the privacy policy.
- `privacy.html` — the privacy policy (see content below).
- `style.css` — shared minimal responsive styling, simple ocean/fishing-adjacent palette.
  Independent of the app's own theme system.

## Privacy Policy Content

Based on FishCast's actual current data practices, plus an honest forward-looking note for
planned-but-unshipped features:

- **Data collected today:** location coordinates from spots the user saves, sent to public
  weather APIs (NOAA CO-OPS, National Weather Service, Open-Meteo) solely to fetch forecast
  data. No account/login system. No personally identifiable information is collected.
- **Storage:** spots and settings are stored locally on-device only; FishCast does not
  operate a backend server that stores user data.
- **Analytics/ads/tracking:** none currently.
- **Planned future data use:** a forward-looking paragraph noting that future versions may
  add in-app purchases (a Pro subscription via RevenueCat) and push notifications, and that
  this policy will be updated if/when those ship.
- **Children's privacy:** not directed at children under 13; no knowing collection of
  children's data.
- **Changes to this policy:** standard notice that updates will be posted here with a
  revised effective date.
- **Contact:** placeholder email `support@fishcastapp.com`, clearly flagged (in the README
  and as an HTML comment near the address) as needing to be swapped for a real, monitored
  address before App Store submission.
- **Effective date:** 2026-07-13.

## Repo Setup

- `~/projects/fishcast-website`, initialized with git, pushed to a new public GitHub repo
  under the `jonathanguyen21` account via `gh repo create`.
- `README.md` explaining what the repo is, how to preview locally (open `index.html`), how
  Pages is configured, and the placeholder-email TODO.
- No CI, no package.json — this is intentionally dependency-free static HTML.

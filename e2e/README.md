# ResearchSpace E2E tests

Playwright tests that exercise a running ResearchSpace application in a real
browser. The suite has its own dependencies and is independent of the main
webpack and Karma build.

## Start ResearchSpace

In the repository root:

```bash
./gradlew runAll
```

Keep it running and use a second terminal for the tests. The default application
URL is `http://localhost:10214`.

## Install

From `e2e/`:

```bash
npm ci
npm run install-browsers
```

The downloaded Playwright Chromium works on normal Linux, macOS, and Windows.
On NixOS, use a system Chromium as described below.

The E2E package uses the native TypeScript 7 compiler. npm automatically
selects the appropriate binary on Linux, macOS (Intel or Apple Silicon), and
Windows (x64 or Arm64).

## Run

The preferred local check is to type-check first and then run the complete
browser suite:

```bash
cd e2e
npm run typecheck && npm test
```

For focused development runs:

```bash
npx playwright test tests/smoke.spec.ts --project=chromium
npx playwright test --grep "opens the application" --project=chromium
npm run test:headed
npm run test:ui
```

The authentication setup logs in once and stores the browser session. Tests in
the Chromium project reuse that session. Because E2E tests can mutate shared
backend state, the suite runs serially with a single worker.

## Writing tests

Use the page object pattern for application features and multi-step user flows:

- Keep specs in `tests/*.spec.ts`. Specs should describe user intent and contain
  the assertions that define the behavior being tested.
- Put reusable page objects in `pages/`. A page object owns its locators and UI
  mechanics, and exposes methods in application language such as `open()`,
  `createEntity()`, or `save()`.
- Prefer accessible Playwright locators such as `getByRole()`, `getByLabel()`,
  and `getByTestId()`. Keep unavoidable CSS selectors inside page objects.
- Reuse the authenticated browser state from `auth.setup.ts`; do not log in
  separately in every spec.
- Generate unique names for data created by a test and clean it up when the
  application supports reliable deletion.

A small, one-off smoke assertion can stay directly in its spec. Introduce a page
object when a workflow or selector is reused, or when UI mechanics would obscure
the behavior the spec is meant to communicate. Do not add feature-specific
helpers to a shared base page; prefer small page objects composed around actual
screens, dialogs, and reusable widgets.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `RS_BASE_URL` | `http://localhost:10214` | Application URL |
| `RS_USER` | `admin` | Login user |
| `RS_PASSWORD` | `admin` | Login password |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE` | unset | Path to a system Chrome or Chromium |

For example, to use an installed browser:

```bash
export PLAYWRIGHT_CHROMIUM_EXECUTABLE="$(command -v google-chrome || command -v chromium || command -v chromium-browser)"
npm test
```

On NixOS, Playwright's downloaded browser cannot normally run directly. Use a
Chromium already on `PATH`:

```bash
export PLAYWRIGHT_CHROMIUM_EXECUTABLE="$(command -v chromium)"
npm test
```

Or obtain Chromium without installing it globally:

```bash
export PLAYWRIGHT_CHROMIUM_EXECUTABLE="$(nix build nixpkgs#chromium --no-link --print-out-paths)/bin/chromium"
npm test
```

Failure screenshots, videos, and traces are written under `e2e/test-results/`.
In CI, the workflow also uploads the Playwright report and, when stack startup
fails, the development-stack log.

## ArtResearch fixture data

The semantic-search fixture is a committed CIDOC-CRM snapshot of 20 real
ArtResearch work IRIs. Its manifest, preserved extraction query, and
regeneration script are documented in
[`fixtures/artresearch/README.md`](fixtures/artresearch/README.md).

Regenerate it from the public development endpoint with:

```bash
cd e2e
npm run fixtures:artresearch
```

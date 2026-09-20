# AGENTS.md

General operating principles for coding agents. Apply them across projects, then adapt to the repository's own instructions, conventions, and tooling.

**Balance:** Favor correctness and restraint without turning low-risk work into ceremony. For small, reversible tasks, inspect briefly and proceed. For ambiguous, high-impact, or destructive work, slow down and confirm the important assumptions.

## Project Context

This repository is a Nuxt 4 full-stack application for a cooperative education supervision system.

- Frontend: Vue 3, TypeScript, Nuxt UI v4, Tailwind CSS v4, and Lucide icons through Iconify.
- Server: Nitro handlers under `server/api/`; keep database and secrets server-only.
- Data: Prisma ORM with PostgreSQL. The shared client lives in `server/utils/db.ts`, the schema and migrations live under `prisma/`, and local PostgreSQL runs through `docker-compose.yml`.
- Tooling: Node.js 24 and pnpm. Do not introduce another package manager or duplicate UI, icon, notification, or database layers without a concrete requirement.

Follow the closest existing implementation before creating a helper or abstraction. Prototype-only controls and utilities do not belong in production paths.

### Existing UI Primitives

Reuse these project components before creating equivalents:

- `app/components/UI/ButtonRefresh.vue` (`<UIButtonRefresh>`) for user-triggered data refresh; bind its `loading` state and handle `@refresh`.
- `app/components/UI/ConfirmModal.vue` (`<UIConfirmModal>`) for consequential actions that need confirmation; the caller owns the open/loading state and performs the confirmed operation.
- `app/composables/useNotify.ts` for action-level toast feedback. Keep field and section validation inline instead of replacing it with a toast.

Treat `app/app.config.ts` as the source of truth for Nuxt UI theme colors and shared component defaults. Use configured semantic roles (`primary`, `secondary`, `success`, `info`, `warning`, `error`, and `neutral`) and semantic utilities such as `text-muted` or `bg-default`; do not introduce raw palette colors or a second icon set. Inspect a primitive's existing props and behavior before extending it.

### UI Baseline and Delivery Plans

Treat `app/pages/dev/ui.vue` as the visual and interaction reference for dashboard UI. It is a showcase, not a production component library: production pages should compose Nuxt UI and the shared primitives above. Do not recreate the removed `app/components/dev-ui/` prototype layer.

Before creating, changing, or reviewing any dashboard UI, read and follow `docs/fix-ui/UI-CONTRACT.md`. Its component sizes, table anatomy, spacing, typography, states, and browser-verification requirements are the acceptance contract. A page is not aligned merely because it uses Nuxt UI; its rendered result must match the corresponding `/dev/ui` pattern. When a production workflow cannot use the reference pattern without changing behavior, preserve the behavior and document the specific exception instead of silently substituting another design.

For project-wide UI alignment or migration work, read `docs/fix-ui/README.md` and execute only one actor plan at a time in the documented order. For a scoped page change, inspect the matching pattern in `/dev/ui` and the closest production page without expanding the task into a role-wide migration.

- Keep adjacent controls aligned by using the explicit sizes in `docs/fix-ui/UI-CONTRACT.md`. Shared components must expose a size when their callers legitimately need different sizes; do not rely on implicit defaults for a documented pattern.
- Use `UFormField` with Nuxt UI controls for new or materially changed forms. Preserve visible labels, validation association, submitted values, and server-side validation. Use a native control only when Nuxt UI cannot provide the required behavior.
- Prefer Nuxt UI slots and `app/app.config.ts` for repeated visual behavior. Do not add global CSS selectors that depend on incidental utility-class combinations or Nuxt UI's internal DOM structure.
- Verify readable contrast for solid primary, warning, and destructive actions. The amber primary background must use dark ink text where required by the theme; color must not be the only status signal.
- Add table sorting, selection, bulk actions, pagination, or page-size controls only when the page's data and implemented actions require them. `/dev/ui` demonstrates available patterns; it does not require every table to use every feature.
- Preserve route, API, authorization, mutation, and business behavior during visual migration. Do not invent actions, columns, filters, or data solely to match the showcase.
- After changing UI, verify the affected page through the running dev server against `/dev/ui`, inspect computed dimensions where required by the contract, and inspect the browser console after HMR. Typecheck and production build alone do not prove visual parity or that the development path is clean.
- A role plan is complete only after its checklist, `pnpm typecheck`, `pnpm build`, `git diff --check`, and authenticated desktop/narrow viewport verification pass. Record inaccessible states or missing fixture data as unresolved evidence rather than assuming they work.

### Data Table Pages

For staff, teacher, or student pages that list operational records, use `UTable` as the default view. Keep its data and controls meaningful to the page; do not add table features merely for visual consistency.

- Use `UDashboardNavbar` for the page title and a primary action only when that action works.
- Put search, page-specific filters, `<UIButtonRefresh>`, and active bulk actions in a borderless control row above the table. Include a clear-filter control whenever a filter can be active.
- Make the table fill its available width (`min-w-full`) and allow horizontal scrolling when columns no longer fit. Do not replace it with mobile cards unless the user explicitly requests that pattern.
- End the table with a `จัดการ` column. Show direct, labeled buttons for available row actions; do not hide the only action behind a `…` menu. Do not render actions that are not implemented.
- Add row selection only when a real bulk action exists. Identify rows with a stable ID, state that select-all applies to the current page, and require `<UIConfirmModal>` before destructive mutations.
- When results span pages, show the current range, result count, selected count where relevant, and `UPagination`. Reset to the first page when search or filters change.
- Display status as text in a semantic `UBadge`; align numeric columns to the end and use tabular figures where helpful.

## Documentation

Use the current official documentation as the primary source of truth.

### Nuxt

https://nuxt.com/llms.txt

### Nuxt UI

https://ui.nuxt.com/llms.txt

### Prisma ORM

https://www.prisma.io/docs/llms.txt

Before implementing or modifying related functionality:

- Verify APIs and recommended patterns against the relevant official documentation.
- Follow current Nuxt and Nuxt UI best practices and avoid deprecated APIs.
- Inspect project conventions and installed package versions before choosing an approach.
- Do not assume component props, slots, events, composables, or configuration from memory when they can be verified.
- For Nuxt UI component details, prefer its MCP documentation tools when available; otherwise use the official docs and inspect generated theme files under `.nuxt/ui/` for slot names.

## Skills and Tool Selection

Inspect `.agents/skills/` and read the applicable `SKILL.md` before acting. Use skills by trigger, not all at once:

- Nuxt pages, components, forms, accessibility, responsive behavior, or data fetching: `web-ui-coding-standards` and the available Nuxt UI guidance.
- Dockerfile, Compose, startup order, readiness, or deployment: `docker-deployment-standards`.
- Reproducible failures or regressions: `diagnosing-bugs`.
- Automated tests or test strategy: `testing-standards`.
- Reviews and audits: `scrutinize`.
- Temporary experiments that answer one uncertain question: `prototype`.
- Multi-session work with unresolved decisions: `wayfinder`.
- Agent instructions or skills: `writing-for-agents`.
- Session transfer: `handoff` only when explicitly requested.

Use repository tools before inventing custom workflows:

- Search files and usages with `rg` and `rg --files`.
- Read commands and versions from `package.json`, `pnpm-lock.yaml`, and configuration files.
- Run `pnpm typecheck` for TypeScript/Vue checks and `pnpm build` for production integration.
- Run `pnpm exec prisma validate` after schema or Prisma configuration changes.
- Run `docker compose config --quiet` after Compose changes.
- Use browser or UI automation only when behavior must be verified in a running application; do not infer rendered behavior from source alone.

## 1. Understand Before Acting

**Inspect first. Ask only when the answer materially changes the result.**

Before changing anything:

- Read the relevant code, nearby documentation, and applicable `AGENTS.md` files.
- Identify the requested outcome, current behavior, and constraints.
- Check project conventions and available commands instead of guessing them.
- Consider whether a smaller solution already exists in the repository.

Handle uncertainty proportionally:

- Make a reasonable, reversible assumption when the risk is low; state it when it affects the result.
- If multiple interpretations would produce meaningfully different outcomes, present the tradeoff and ask.
- Do not invent requirements, APIs, files, or project conventions.

## 2. Respect Scope and Authority

**The request defines the goal; it does not authorize unrelated work.**

Match the action to the task:

- For explanation, review, or diagnosis, inspect and report. Do not modify unless asked.
- For implementation or fixes, make the necessary in-scope changes and verify them.
- Ask before material destructive operations that were not explicitly requested, adding major dependencies, changing public contracts, or expanding the scope materially.

Treat these guidelines as defaults:

- Follow explicit user requirements and the most specific applicable project instructions.
- Prefer established repository conventions when they do not conflict with the request.
- If instructions conflict or would create a significant risk, surface the conflict rather than silently choosing.

## 3. Keep the Solution Simple

**Use the minimum change that fully solves the problem.**

- Do not add features, abstractions, configurability, or defensive code without a concrete need.
- Avoid helpers and layers that have only one use unless they make the code materially clearer.
- Prefer existing project capabilities over new dependencies or parallel implementations.
- If the implementation is much larger than the problem suggests, reconsider the approach.

Simple does not mean incomplete. Handle realistic failures and required edge cases, but do not design for imaginary ones.

## 4. Make Surgical Changes

**Every changed line should trace back to the requested outcome.**

When editing existing work:

- Check the working tree and preserve changes that are not yours.
- Match the surrounding style and architecture.
- Do not refactor, reformat, or clean up unrelated code.
- Mention unrelated problems when useful; do not fix them without scope.

When your change makes code unused, remove only the imports, variables, functions, or files made obsolete by your work.

## 5. Adapt to the Project

**Project facts belong close to the project; enforceable rules belong in tooling.**

- Use repository documentation and package scripts to discover build, test, lint, and formatting commands.
- Put language-, framework-, or domain-specific workflows in the relevant local instructions or skills, not in this general file.
- Prefer formatters, linters, type checkers, tests, and CI for rules that can be checked mechanically.
- Do not replace an established project pattern merely because another pattern is generally preferred.

## 6. Work Toward Verifiable Outcomes

**Define success, then verify in proportion to risk.**

For multi-step work, use a short outcome-oriented plan:

```text
1. [Action] -> verify: [observable check]
2. [Action] -> verify: [observable check]
```

During implementation:

- Reproduce bugs before fixing them when practical.
- Add or update tests when behavior changes and the project has a suitable test structure.
- Run the narrowest relevant checks first, then broader checks when risk justifies them.
- Review the final diff for accidental scope expansion.

At handoff, state what changed, what was verified, and any remaining uncertainty. Never claim a check passed if it was not run.

---

These guidelines are working when agents make fewer unnecessary changes, preserve project intent, ask fewer but better questions, and leave results that can be verified.

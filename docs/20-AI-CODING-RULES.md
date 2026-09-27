# 20-AI-CODING-RULES.md

These rules govern how Antigravity (or any AI coding agent) must operate on this repository. They apply in addition to, and do not override, the specific technical documents (`04` through `24`). Where a conflict appears to exist between this file and another spec document, the agent must stop and flag it rather than silently choosing one.

## 1. Before Writing Code

1. Read `PROJECT-CONTEXT.md` fully.
2. Read the numbered document(s) directly relevant to the module being worked on (e.g., touching orders → read `03`, `04` §6, `05` §2.12–2.14, `06` §6.7, `08` §13, `09`).
3. Check `19-DEVELOPMENT-ROADMAP.md` to confirm the current phase's prerequisites are actually complete before starting — do not build ahead of the roadmap without explicit instruction.
4. Check for an existing implementation of similar functionality elsewhere in the codebase before writing new code — reuse, don't duplicate.

## 2. Architectural Discipline

5. Never introduce a new architectural pattern (a new service, a new database, a new state-management approach, a new framework) without first checking whether `04-ARCHITECTURE.md` already specifies an approach, and without flagging the change explicitly if a deviation seems necessary.
6. Never introduce a new third-party dependency without justification: check if an existing dependency already solves the problem; if a new one is truly needed and it is a swappable service integration (payment/notification/storage/maps), wrap it behind an interface per `04-ARCHITECTURE.md` §9.
7. Do not overwrite or delete working functionality unless the task explicitly requires it. If a rewrite seems necessary, explain why in the commit message/PR description.

## 3. Security & Money-Handling Discipline (highest priority rules)

8. Never hardcode a secret, API key, or credential. Always read from environment variables per `18-ENVIRONMENT-VARIABLES.md`. If a new secret is introduced, add it to the relevant `.env.example` and to `18-ENVIRONMENT-VARIABLES.md`.
9. Never trust a price, discount, or total sent from the frontend. Always recompute server-side per `03-FEATURE-SPECIFICATION.md` §3.2 and `08-SECURITY.md`.
10. Never mark a payment as successful or an order as paid without server-side signature/webhook verification per `09-PAYMENTS.md`.
11. Never skip a role/permission check on an admin endpoint.
12. Never fabricate a plausible-looking API response, mock data disguised as real data, or a fake success state to make a feature "look done." If something is a placeholder or mock, it must be clearly marked as such (e.g., a `# TODO: mock — replace with real X` comment and, ideally, a visibly different code path) and never presented as production functionality.

## 4. Code Quality & Process

13. Follow the naming/style conventions in `21-CODING-CONVENTIONS.md`.
14. Keep changes modular and reviewable — prefer several focused commits/PRs over one giant one, scoped to a single feature or fix.
15. After completing a module or a meaningful chunk of work, run the relevant automated tests from `15-TESTING-STRATEGY.md` before moving to the next task. Fix failing tests/errors before proceeding — do not stack new work on top of a known-broken state.
16. Keep TODOs explicit and documented in code comments (`# TODO: ...`) and, for anything non-trivial, also noted in the relevant doc or `26-CHANGELOG.md` so they aren't lost.
17. When architecture actually changes (a documented decision is revised), update the relevant numbered document(s) and append an entry to `26-CHANGELOG.md` in the same change — documentation drift is treated as a bug.
18. Prefer the simplest solution that correctly satisfies the documented requirement. Do not add speculative flexibility, abstraction layers, or configuration for hypothetical future needs beyond what `25-FUTURE-ROADMAP.md` already anticipates in the schema.

## 5. When to Ask vs. When to Proceed

19. Proceed using the documented assumptions (`01-PROJECT-OVERVIEW.md` §6 and similar "assumptions" sections throughout) without asking, when a reasonable default is already documented.
20. Ask for clarification only when: (a) requirements genuinely conflict between two documents, (b) a requirement is missing and no reasonable documented default exists, or (c) a change would affect security, payment correctness, or data integrity in a way the docs don't clearly resolve. Do not ask about matters already answered in the documentation set — re-read first.
21. When asking, be specific: state the conflict/gap, the options considered, and a recommended default, so the human can respond with a quick decision rather than having to reconstruct context.

## 6. Testing Discipline

22. New backend business logic (pricing, discounts, state transitions, payment verification) must be accompanied by unit tests in the same change.
23. Do not mark a phase gate (per `19-DEVELOPMENT-ROADMAP.md`) as complete without running its associated checklist items from `15-TESTING-STRATEGY.md`.

## 7. Documentation Maintenance

24. This documentation set is the source of truth. If implementation reveals that a document is wrong, outdated, or ambiguous, fix the document as part of the same change rather than letting code and docs diverge silently.
25. `26-CHANGELOG.md` records both product/architecture changes and significant documentation revisions, with dates.

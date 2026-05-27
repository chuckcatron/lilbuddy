Full pipeline: enrich → contract → work for a single story. Stops at checkpoints for user input.

**Model routing:** Phase 1 (enrich) automatically runs its deep codebase investigation using an Opus subagent (via `model: "opus"` on the Agent tool call). You stay on Sonnet for orchestration, checkpoints, contract, and work phases. No manual model switching needed.

Card: $ARGUMENTS

If no card number, ask. Wait.

---

## Phase 1: Enrich

Run `/enrich {number}` logic (see enrich.md for full steps). In short:

1. Fetch AZDO item + relations
2. Identify target repos, load registry
3. **Deep codebase investigation — use an Agent with `model: "opus"`** (Explore agents, parallel where possible). Pass full context: story text, target repos, registry paths, and investigation questions. Collect results back here.
4. Validate story claims against code — show corrections
5. Build implementation guide + acceptance criteria as HTML
6. Present all proposed AZDO changes

### CHECKPOINT 1

> **Enrich done.** Here's what I'd update on AB#{number}:
> {summary of changes, corrections, implementation guide highlights}
>
> Options:
>
> 1. **Go** — apply changes to AZDO, move to contract
> 2. **Redo** — tell me what to change, I'll re-enrich
> 3. **Skip** — story already enriched, jump to contract
> 4. **Stop** — done for now

Wait. On "Go" → update AZDO, sync pairing context, proceed to Phase 2. On "Redo" → ask what to change, re-run enrich. On "Skip" → proceed to Phase 2 without AZDO update. On "Stop" → end.

---

## Phase 2: Contract

Run `/contract {number}` logic (see contract.md for full steps). In short:

1. Fetch AZDO item (re-fetch — it may have been updated in Phase 1)
2. Determine story type
3. Target repos + registry
4. Scan for input paths + pattern references
5. Check dependencies
6. Verification commands from registry
7. Finalize contract using prompt-contract.txt template

Write contract to `.claude/prompt/AB#{number}-{kebab}.txt`.

### CHECKPOINT 2

> **Contract ready.** Saved to `.claude/prompt/AB#{number}-{name}.txt`
> {summary: repo, story type, files to create/modify, checkpoints}
>
> Options:
>
> 1. **Go** — start implementation
> 2. **Redo** — tell me what to change in the contract
> 3. **Stop** — done for now

Wait. On "Go" → proceed to Phase 3. On "Redo" → ask what to change, update contract file. On "Stop" → sync pairing context, end.

---

## Phase 3: Work

Run `/work {number}` logic (see work.md for full steps). In short:

1. Read contract + registry
2. Pre-flight validation (pattern refs, inputs, commands, change plan)
3. Read pattern references end-to-end
4. Verify dependencies
5. Determine base branch, create feature branch
6. Walk story to **Active** — PATCH `System.State = Active` + `System.AssignedTo = charles.catron@gmail.com` via AZDO API
7. Present implementation plan

### CHECKPOINT 3

> **Implementation plan:**
> {checkpoint-based plan from contract}
>
> Options:
>
> 1. **Go** — start coding
> 2. **Redo** — adjust the plan
> 3. **Stop** — done for now

Wait. On "Go" → execute. On "Redo" → adjust, re-present. On "Stop" → end.

7. Execute per checkpoint (write → verify → self-review → commit, repeat)
8. Final verification (all commands)
9. Post-execution diff review
10. Verify all acceptance criteria

### CHECKPOINT 4

> **Implementation complete.**
> {summary: commits, files changed, test results, AC checklist}
>
> Options:
>
> 1. **PR** — push + create PR + walk story to Review + add AZDO comment
> 2. **Redo** — tell me what to fix
> 3. **Stop** — leave on branch, no PR yet

Wait. On "PR" → push, create PR (stacked if predecessor exists), walk story to **Review** (PATCH `System.State = Review`), add PR URL comment to AZDO, then proceed to Phase 4. On "Redo" → fix, re-verify, re-present. On "Stop" → sync pairing context, end.

---

## Phase 4: Cleanup

Run automatically after PR is created — no checkpoint, no user input needed.

1. **Code review** — Run `/code-review` logic on the PR (see code-review.md). Present findings inline.
2. **Switch to master** — `git checkout master`
3. **Delete contract file** — Remove `.claude/prompt/AB#{number}-{kebab}.txt`
4. **Sync pairing context** — Update phase to "PR created, cleanup complete"

If the code review surfaces Critical issues, pause and present them before switching branches — the user may want to fix before the PR goes up for human review.

---

## Pairing Context

Sync after every checkpoint (silent). Update phase to reflect current state:

- After CP1: "Enriched"
- After CP2: "Contract generated"
- After CP3: "Implementation in progress"
- After CP4: "PR created" or "Implementation complete"
- After Phase 4: "PR created, cleanup complete"

Path: `/Users/chuckcatron/Library/CloudStorage/OneDrive-Copeland/Verdant-Pairing/AB#{number}/context.md`

## Errors

Same error handling as individual commands (see enrich.md, contract.md, work.md). Additional:

- Phase fails mid-way → stop at that phase, report, let user decide to retry or stop
- User says "skip" on enrich but story has no description → warn, contract may be thin

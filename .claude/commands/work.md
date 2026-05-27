Execute the Prompt Contract for a story. Reads the contract file and carries out the work.

**Model: Sonnet is fine.** No model switch needed.

Story: $ARGUMENTS

If no story number, ask. Wait.

### 1. Find Contract

```bash
ls .claude/prompt/AB#*{number}*.txt
```

No contract → tell user to run `/contract {number}` first. Stop. Multiple matches → ask user to pick.

### 2. Read Contract + Registry

Read contract. Extract: story type, repos, branch, inputs, pattern refs, scope, change plan, verification commands, checkpoints, constraints, edge cases, AC.

Load registry per repo: `cat .claude/registry/{key}.json`. Cross-reference: do contract commands match registry? Are there anti-patterns? What's the commit format?

### 3. Pre-Flight Validation (MANDATORY)

Before writing any code:

- **Pattern refs exist** — `ls` each. Missing → stop, report.
- **Input files exist** — read each. Missing → report, ask.
- **Commands work** — run type-check/build + unit tests on unmodified code. Fail before your changes → report, don't start.
- **Change plan plausible** — target dirs exist, files to modify exist.
- **Anti-patterns** — print registry anti-patterns for user.

All pass → report "Pre-flight passed." Any fail → stop, resolve first.

### 4. Read Pattern References (MANDATORY)

Read each pattern ref end-to-end. Note: naming, import ordering, decorators/annotations, error handling, test structure, DTO shapes. These are your structural templates.

### 5. Verify Dependencies

Check: prior work exists (PRs merged, migrations run), repos accessible (`git status`), multi-repo lead changes in place. Missing → report, ask.

### 6. Branch + Walk Card

**6a. Determine base branch:**

- Check predecessor links (`System.LinkTypes.Dependency-Reverse`).
- Predecessor exists + has unmerged remote branch → base off predecessor (stacked).
- Otherwise → base off master/main.

Report: base branch + reasoning.

**6b. Create feature branch:**

```bash
cd /Users/chuckcatron/projects/verdant-root/{repo}
DEFAULT_BRANCH=$(git remote show origin | grep 'HEAD branch' | awk '{print $NF}')
git fetch origin
git checkout {base} && git pull
git checkout -b {target-branch}
```

**6c. Walk card to Doing:**
Find child Task from relations. Walk via: `python3 scripts/azdo_walk_state.py Doing {task_id} --assignee "chuck.catronjr@copeland.com"`. No child Task → walk item directly via API.

### 7. Plan Implementation

Present checkpoint-based plan mapping to contract's Change Plan:

> **Checkpoint N:** {description}
>
> - Create/Modify: {files}
> - Verify: {command}

Wait for confirmation.

### 8. Execute (per checkpoint)

For each checkpoint:

**8a. Write code** — follow pattern conformance, match pattern refs, search for existing utilities before creating, stay within change plan, write tests alongside code.

**8b. Verify** — run type-check + lint + applicable tests. Fail → fix before next checkpoint.

**8c. Self-review** — re-read every changed file. Check: duplicates? matches pattern refs? unused imports? anti-pattern violations?

**8d. Commit** — correct format from registry. Stage specific files only.

Repeat 8a-8d per checkpoint.

### 9. Final Verification

Run ALL verification commands from contract (not just last checkpoint's):

```bash
{build} && {type_check} && {lint} && {unit_test} && {e2e_test}
```

All must pass.

### 10. Post-Execution Review (MANDATORY)

**10a.** `git diff {base}...HEAD --stat` + full diff
**10b.** Compare each changed file against its pattern reference
**10c.** Grep for duplicates of new functions/types in repo + shared_modules
**10d.** Check anti-patterns from registry

Report: files changed, pattern conformance, duplicate check, anti-pattern check. Issues → fix + re-verify.

### 11. Verify Acceptance Criteria

Walk EVERY criterion from contract. Run commands, don't just assert. Note anything needing manual verification.

Present checklist: Universal → Story-type → Story-specific, each with verification method + result.

### 12. Wrap Up

Present summary: changes, commit count, files changed, test counts, coverage.

Do NOT push or PR automatically — wait for user.

**When user asks to PR:**

- Stacked branch → `gh pr create --base {predecessor_branch}`
- Include `> **Stacked on:** #{predecessor_pr} (AB#{predecessor})` in body if stacked
- Normal → `gh pr create`

After PR, walk card to Review:

```bash
python3 scripts/azdo_walk_state.py Review {task_id}
```

Add PR link comment to work item:

```bash
AUTH=$(echo -n ":${AZDO_PAT}" | base64)
curl -s -X POST -H "Authorization: Basic ${AUTH}" -H "Content-Type: application/json" \
  "https://dev.azure.com/DigitalAndConnectedTechnologies/Verdant/_apis/wit/workitems/{id}/comments?api-version=7.1-preview.4" \
  -d '{"text": "<p><strong>PR opened:</strong> <a href=\"{url}\">{url}</a></p>"}'
```

### 13. Sync Pairing Context

Silent. Write to `/Users/chuckcatron/Library/CloudStorage/OneDrive-Copeland/Verdant-Pairing/AB#{number}/context.md`:

```markdown
# AB#{number} — {title}

Updated: {YYYY-MM-DD} by /work

## Current State

- Phase: {Implementation complete | PR created | In progress — checkpoint N/M}
- Branch: {name}

## What Was Done

- {files created/modified summary}
- {commit count + descriptions}

## Test Results

- Unit: {pass/fail, count}
- E2E: {pass/fail, count}

## Blockers

- {unresolved issues, manual verification needed}

## Next

- [ ] {PR review, manual QA, deploy, etc.}
```

## Errors

- No contract → run /contract first
- Ambiguous scope → stop, ask
- Test failures → fix root cause, never skip
- Edge case from contract → follow contract's guidance
- Files outside scope needed → stop, ask
- AZDO walk fails → report, continue work
- Approach fails after 2 attempts → stop, report, propose alternative, wait
- Post-review finds issues → fix before reporting done
- OneDrive fail → warn, don't block

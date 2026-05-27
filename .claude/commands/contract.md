Generate a Prompt Contract from an AZDO work item, pre-filled with scope, inputs, and acceptance criteria.

**Model: Sonnet is fine.** No model switch needed.

Card: $ARGUMENTS

If no card number, ask. Wait.

## Process

Track with TaskCreate (7 tasks: fetch, type, repos, scan, deps, commands, write). Update as you go.

Write contract incrementally at `.claude/prompt/AB#{number}-{kebab}.txt` — valid markdown at every stage, placeholders for unfilled sections.

### 1. Fetch AZDO Item

```bash
AUTH=$(echo -n ":${AZDO_PAT}" | base64)
curl -s -H "Authorization: Basic ${AUTH}" \
  "https://dev.azure.com/DigitalAndConnectedTechnologies/Verdant/_apis/wit/workitems/{id}?\$expand=relations&api-version=7.1" | python3 -c "
import json, sys, re
d = json.load(sys.stdin)
f = d['fields']
strip = lambda s: re.sub(r'<[^>]+>', ' ', s or '').strip() if s else ''
print('Title:', f.get('System.Title'))
print('Type:', f.get('System.WorkItemType'))
print('Sprint:', f.get('System.IterationPath'))
print('State:', f.get('System.State'))
print('Tags:', f.get('System.Tags') or 'None')
print('Effort:', f.get('Microsoft.VSTS.Scheduling.Effort'))
print()
print('Description:', strip(f.get('System.Description', ''))[:2000])
print()
print('Acceptance Criteria:', strip(f.get('Microsoft.VSTS.Common.AcceptanceCriteria', ''))[:2000])
print()
print('Relations:')
for r in d.get('relations', []):
    print(' ', r['rel'], '->', r['url'].split('/')[-1])
"
```

Task → also fetch parent. Customer Story → also fetch children. Print: AB#, title, type, sprint, parent, tags, description summary, AC summary.

### 2. Story Type

Core/Customer Story → Feature. Ops Changes + Security tag/smell → Security/Snyk. Ops Changes + Tech Debt tag/smell → Tech Debt. Task under Core → Feature. CDK/infra smell → Infrastructure/CDK. Fix/bug/broken smell → Bug Fix. Ambiguous → ask.

### 3. Target Repos + Registry

Match description to repos using CLAUDE.md Architecture Map. Load registry: `cat .claude/registry.json`. Extract: commands, pattern_references, shared_modules, anti_patterns, commit_format for each target repo. Print repo/stack/key table.

No registry entry → scan package.json or pom.xml.

Fill contract: target repos, branch (`feature/AB#{number}-{kebab}`), registry keys, commit format.

### 4. Scan Files

Start with registry pattern_references + shared_modules. Then Glob/Grep for story-relevant files in target repos. Match keywords from description. Pick 5-10 input paths + best pattern reference per file type you'll create.

Only scan the stack that applies — skip irrelevant stacks entirely.

Fill contract: Inputs + Pattern References (stack-specific lines only).

### 5. Dependencies

Check: predecessor links in relations, DB migrations in repo, cross-service calls in AC, multi-repo ordering. Print findings or "None".

Fill contract: Dependencies + Multi-Repo Coordination.

### 6. Verification Commands

Copy from registry `commands` → contract. Null = N/A. Copy anti_patterns + commit_format into Constraints. Define commit checkpoints for this story's type + stack.

### 7. Finalize

Read template: `cat .claude/prompt/prompt-contract.txt`

Fill remaining sections from gathered data:

- Scope (In/Out) ← description + AC
- Change Plan (Create/Modify/No-Touch) ← scope + patterns + inputs
- Expected Output ← AC
- Edge Cases ← template defaults + story-specific
- Acceptance Criteria ← template universal + matching story-type checklist (delete others) + AZDO AC

**Contract file MUST use standard section names from prompt-contract.txt** — /work depends on them.

Verify: no placeholders remain, sections consistent, all AC included.

### 8. Present

Show contract. Ask:

> Saved to `.claude/prompt/AB#{number}-{name}.txt` — changes before we go?

### 9. Sync Context

Silent. Write to `/Users/chuckcatron/Library/CloudStorage/OneDrive-Copeland/Verdant-Pairing/AB#{number}/context.md`:

```markdown
# AB#{number} — {title}

Updated: {YYYY-MM-DD} by /contract

## Current State

- Phase: Contract generated — ready for /work
- Contract: .claude/prompt/AB#{number}-{name}.txt

## Summary

- Type: {type} | Repos: {repos} | Effort: {pts}
- {files create/modify count}, {key commands}, {notable constraints}

## Decisions

- {scope/pattern choices made}

## Next

- [ ] Review contract
- [ ] /work {number}
```

## Errors

- 401/403 → check $AZDO_PAT
- Bad card → ask again
- Can't ID repo → ask
- No test infra → note in contract, flag to user
- OneDrive fail → warn, don't block

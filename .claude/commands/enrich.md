Enrich an AZDO story with code-grounded implementation details by investigating the codebase.

**Model routing:** Step 3 (deep codebase investigation) automatically uses Opus subagents (via `model: "opus"` on Agent tool calls). No manual model switching needed.

Card: $ARGUMENTS

If no card number, ask. Wait.

## Process

Track with TaskCreate. Show findings inline after each step.

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
print('State:', f.get('System.State'))
print('Sprint:', f.get('System.IterationPath'))
print('Tags:', f.get('System.Tags') or 'None')
print('Effort:', f.get('Microsoft.VSTS.Scheduling.Effort'))
print('StoryPoints:', f.get('Microsoft.VSTS.Scheduling.StoryPoints'))
print()
print('Description HTML (for patching):')
print(f.get('System.Description', ''))
print()
print('AC HTML (for patching):')
print(f.get('Microsoft.VSTS.Common.AcceptanceCriteria', ''))
print()
print('Relations:')
for r in d.get('relations', []):
    print(' ', r['rel'], '->', r['url'].split('/')[-1])
"
```

Print raw HTML for desc/AC — needed for PATCH payloads.

**Mode detection:**

- **Task** → fetch parent for context, proceed single-story
- **Core / Operational Changes** → single-story mode (Steps 2-11)
- **Customer Story** → fetch ALL children via `System.LinkTypes.Hierarchy-Forward`, batch API for efficiency. Build tree: CS → Core stories → mirror Tasks. If Core stories have no child Task, note for creation in Step 1c.

### Customer Story — No Children

If CS has no child Core stories, ask:

> AB#{id} has no children. Should I: (1) investigate + propose story breakdown, or (2) enrich CS only?

Option 1 → investigate (Steps 2-3), propose breakdown table (title, pts, phase, deps), wait for confirmation, then create Core stories + mirror Tasks per azdo-playbook.md process:

- Core: type=Core, parent link to CS, predecessor/successor chains, Effort=StoryPoints, Priority=2
- Tasks: type=Task, parent link to Core, RemainingWork=OriginalEstimate (1pt=4h, 2pt=8h, 3pt=12h, 5pt=20h), same desc/AC as parent Core

### 2. Identify Target Repos

Parse all story descriptions for technical keywords. Map to repos using CLAUDE.md Architecture Map. Load registry per repo: `cat .claude/registry/{key}.json`. Print repo/stack table.

### 3. Deep Codebase Investigation

Use `subagent_type=Explore` agents **with `model: "opus"`**. Launch parallel agents for independent areas. **CS mode: ONE shared investigation covering all children — don't investigate per story.**

Pick relevant investigations from:

- **Entities/DTOs** — when stories mention data models. Find entities, DTOs, list ALL fields, check `@Column` names.
- **Redis/Cache** — when stories mention Redis keys. Find key pattern, who writes, who reads, fields stored, data flow.
- **API endpoints** — when stories mention routes. Find controllers, analogous endpoints, middleware/guards, auth.
- **Message protocol** — when stories mention thermostat messages. Find message entities, constants/enums, verify field names across TS/Java.
- **Kinesis/Events** — when stories mention streams. Find producer/consumer, message format, existing processors.
- **CDK/Infrastructure** — when stories mention ECS/Lambda/ALB. Find analogous constructs, service patterns, stack files.
- **Cross-service** — when stories mention calling other services. Find HTTP client patterns, available endpoints, field matching.

Show findings summary after each investigation.

### 4. Validate Story Claims

Cross-reference every technical assertion against investigation findings. Look for: fields that don't exist, incorrect field meanings, missing fields, wrong data flow, incorrect API refs, stale patterns, cross-story inconsistencies.

Show validation table: Story | Claim | Status | Finding

Ask user to confirm corrections before proceeding.

### 5. Build Implementation Guide (per story)

**CS mode:** CS description first (overview, phases, breakdown table, architecture), then each Core story.

**Core story guide includes:**

- Files to Create — exact path, purpose, pattern reference
- Files to Modify — exact path, what changes
- Key Patterns to Follow — file:line references
- Field Mappings (if applicable)
- Not In Scope — what's excluded, reference which sibling handles it

### 6. Build Acceptance Criteria (per story)

Specific, testable, code-grounded criteria. Always include: functional criteria, unit test specifics, 80% coverage, no-regression.

CS AC = high-level outcomes. Core AC = implementation detail.

### 7. Generate HTML

Build Description and AC as HTML per azdo-playbook.md templates.

**CS description:** Overview → Problem/Context → Approach (phases table) → Story Breakdown (table with AB#, title, pts) → Key Decisions → Architecture/Repos

**Core description:** Context → Scope (numbered list) → Not In Scope → Implementation Guide (New Files table, Modified Files table, Key Patterns list)

**AC (both):** `<div><ol><li>...</li></ol></div>`

### 8. Present Changes

Show summary of all changes. CS mode: table of all items with change description. List corrections applied.

> Apply all changes to AZDO?

Wait for confirmation.

### 9. Update AZDO

Use Python (never shell heredocs — HTML entities get mangled). Update order: CS → Core stories → mirror Tasks.

```python
#!/usr/bin/env python3
import json, os, urllib.request, ssl, base64

PAT = os.environ["AZDO_PAT"]
ORG = "https://dev.azure.com/DigitalAndConnectedTechnologies"
PROJECT = "Verdant"
ctx = ssl.create_default_context()
creds = base64.b64encode(f":{PAT}".encode()).decode()

def patch(item_id, body):
    url = f"{ORG}/{PROJECT}/_apis/wit/workitems/{item_id}?api-version=7.1"
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="PATCH")
    req.add_header("Content-Type", "application/json-patch+json")
    req.add_header("Authorization", f"Basic {creds}")
    resp = urllib.request.urlopen(req, context=ctx)
    result = json.loads(resp.read())
    print(f"  AB#{item_id} updated (rev {result['rev']})")
    return result
```

Patch desc + AC for each item. For CS also patch Effort + StoryPoints.

### 10. Summary

Print: items updated (count), key changes, investigation artifacts discovered.

### 11. Sync Pairing Context

Silent. Write to `/Users/chuckcatron/Library/CloudStorage/OneDrive-Copeland/Verdant-Pairing/AB#{number}/context.md`:

```markdown
# AB#{number} — {title}

Updated: {YYYY-MM-DD} by /enrich

## Current State

- Phase: Enriched — ready for /contract or /work

## What Was Done

- {investigation findings summary}
- {corrections applied}

## Key Files & Patterns

- {important paths, DTOs, services found}

## Repos

- {repo}: {what's relevant}

## Decisions

- {technical decisions, corrections, scope clarifications}

## Next

- [ ] /contract {number}
- [ ] /work {number}
```

## Errors

- 401/403 → check $AZDO_PAT
- Bad card → ask again
- Can't ID repo → ask
- No relevant code found → report what was searched, ask for guidance
- No description on story → ask user to describe the feature first
- User rejects changes → ask what to modify, regenerate
- Mirror Task creation fails → report, continue enriching Core story
- Core story creation fails → report what was created, ask how to proceed
- OneDrive fail → warn, don't block
- Core stories missing mirror Tasks → create them (Step 1c), don't skip

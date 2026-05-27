---
name: work-story
description: Start working on an AZDO work item — read the card, sync submodules to main/master, and create a feature branch
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
  - WebFetch
---

# /work-story Skill

Prepare the workspace to start development on an Azure DevOps work item.

## Usage

```
/work-story              # Prompts for card number
/work-story 41000        # Start with card AB#41000
/work-story 41000 41001  # Start with multiple cards
```

## Instructions

### Step 0: Get the Card Number

If no card number was provided as an argument, ask the user:

> What AB# card number(s) are you working on?

Wait for the response before proceeding.

### Step 1: Read the AZDO Work Item(s)

For each card number provided, fetch the work item from Azure DevOps:

```bash
AUTH=$(echo -n ":${AZDO_PAT}" | base64)
curl -s -H "Authorization: Basic ${AUTH}" \
  "https://dev.azure.com/DigitalAndConnectedTechnologies/Verdant/_apis/wit/workitems/{id}?\$expand=relations&api-version=7.1"
```

**IMPORTANT:** Always use the explicit `Authorization: Basic` header (not `-u`). The `-u` flag intermittently returns 302 redirects.

Extract and display:

- **ID & Type** (Core, Customer Story, Operational Changes, Task)
- **Title**
- **State**
- **Iteration Path** (sprint)
- **Assigned To**
- **Description** (summarize, don't dump raw HTML)
- **Acceptance Criteria** (summarize key points)
- **Parent link** (if any — follow `System.LinkTypes.Hierarchy-Reverse` relation to get parent title)
- **Child links** (if Customer Story — list child Core stories)

If the item is a **Customer Story**, also fetch and summarize its child Core stories so the user can see the full breakdown.

If the item is a **Task**, also fetch its parent story for context.

Present a clean summary like:

```
AB#41000 — Core — Sprint 22
Title: Story 3/7: Add room temperature endpoint
State: Ready
Parent: AB#40500 — Room Temperature Dashboard (Customer Story)

Description: Implement GET /api/v3/rooms/:id/temperature endpoint...

Acceptance Criteria:
  1. Endpoint returns current temperature, setpoint, and mode
  2. Requires authentication via Cognito JWT
  3. All unit tests pass
  4. All e2e tests pass
```

### Step 2: Sync All Submodules to Main/Master

Run the sync script to ensure all submodules are on their default branch with latest code:

```bash
/Users/chuckcatron/projects/verdant-root/scripts/sync.sh
```

Report the sync results to the user. If any submodule has stashed changes or errors, highlight them.

### Step 3: Determine Target Repo(s)

Based on the work item title, description, and acceptance criteria, identify which repo(s) will be affected. Use the Architecture Map from CLAUDE.md to match:

- API endpoint work → `verdant_system` or the relevant Java service
- Frontend/UI work → `verdant-web` or `verdant-support`
- Infrastructure/CDK → the relevant CDK project
- Edge device work → `verdant_zx_ebox`, `verdant_bacnet`, etc.
- Data pipeline → `verdant_stream_raw_v2`, `verdant_stream_proc_v2`, etc.
- Security/dependency updates → the specific repo mentioned

If uncertain, ask the user which repo(s) to create the feature branch in.

### Step 4: Create Feature Branch

For each target repo, create a feature branch:

```bash
cd /Users/chuckcatron/projects/verdant-root/{repo}
git checkout -b feature/AB#{card_number}-{short-description}
```

**Branch naming rules:**

- Prefix: `feature/` (for features, core stories), `bugfix/` (for bug fixes), `security/` (for security/Snyk work), `chore/` (for tech debt/ops changes)
- Format: `{prefix}/AB#{number}-{kebab-case-description}`
- Keep the description part short (3-5 words max)
- Derive the description from the work item title

**Special cases:**

- `verdant_sensor_api`: Default branch is `main-docker`, not `main`
- `verdant-support`: Commit format is `AB#[number] - [type]: subject` (different commitlint)
- If the `security/` prefix conflicts with an existing ref, fall back to `snyk/`

### Step 5: Walk AZDO State to "Doing"

Ask the user if they want to move the card to **Doing** now. If yes, use the state walker script:

```bash
python3 /Users/chuckcatron/projects/verdant-root/scripts/azdo_walk_state.py Doing {task_id} --assignee "chuck.catronjr@copeland.com"
```

**State walker rules (from azdo-playbook.md):**

- **Tasks drive state, stories follow.** The walker automatically advances the parent story when the first child task moves.
- If the work item is a **Core** or **Operational Changes** story, find its child Task first and walk the Task (not the story directly).
- If the work item is a **Task**, walk it directly.
- If the work item is a **Customer Story**, do NOT walk it — the user picks up individual Core stories/Tasks, not the parent.
- The walker sets `StartDate` and `AssignedTo` automatically when entering Doing.
- The walker also sets `OriginalEstimate` on Tasks (required by AZDO rules for Doing state).
- **Identity format:** Always use email `chuck.catronjr@copeland.com` — never `"Chuck Catron"` (causes unknown identity error).

If the card is already in **Doing** or a later state, skip this step and note the current state.

### Step 6: Check for Existing PRs (gh)

Check if there are any existing PRs related to this card in the target repo(s):

```bash
cd /Users/chuckcatron/projects/verdant-root/{repo}
gh pr list --search "AB#{card_number}" --state open
```

If open PRs exist, display them so the user knows. They may want to check out an existing branch instead of creating a new one.

Also check if the feature branch already exists on the remote:

```bash
git ls-remote --heads origin "feature/AB#{card_number}*"
```

If a remote branch exists, ask the user whether to:

1. Check out and track the existing remote branch
2. Create a new branch anyway (different name)

### Step 7: Summary

Print a final summary:

```
Ready to work on AB#41000

Card: Story 3/7: Add room temperature endpoint
Type: Core | Sprint 22 | State: Doing
Assigned: chuck.catronjr@copeland.com

Submodules synced to default branches
Feature branch created:
  verdant_system  -> feature/AB#41000-room-temperature-endpoint
  verdant-web     -> feature/AB#41000-room-temperature-endpoint

Next steps:
  - Review the acceptance criteria above
  - Start implementation in verdant_system
  - Run /status to check workspace state anytime
  - When done: commit, push, create PR with `gh pr create`
  - Walk state: python3 scripts/azdo_walk_state.py Review {task_id}
```

### Error Handling

- If the AZDO API returns 401/403, tell the user to check `$AZDO_PAT` is set in `~/.bash_profile`
- If a card number doesn't exist, report it and continue with remaining cards
- If sync.sh fails on a submodule, report it but continue with branch creation
- If a feature branch already exists in a repo, ask the user if they want to check it out instead of creating a new one
- If `gh` is not authenticated, tell the user to run `gh auth login`
- If the state walker fails (e.g., missing OriginalEstimate), report the error and suggest manual fix

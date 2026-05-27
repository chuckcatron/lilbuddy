---
name: status
description: Show the status of all Verdant submodules at a glance
allowed-tools:
  - Bash
---

# /status Skill

Show the state of all Verdant project submodules.

## Usage

```
/status           # All submodules
/status --fetch   # Fetch remotes first, then show status
```

## Instructions

1. **Optionally fetch** — if `--fetch` is passed, run `git fetch --all --recurse-submodules` first

2. **For each submodule**, report:
   - Current branch
   - Uncommitted changes (yes/no, count of modified files)
   - Ahead/behind remote (e.g., "2 ahead, 1 behind")
   - Last commit (short hash + subject)

3. **Run this command** to gather all info:

   ```bash
   git submodule foreach --quiet '
     branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "detached")
     changes=$(git status --porcelain | wc -l | tr -d " ")
     ahead=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "?")
     behind=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo "?")
     last=$(git log -1 --oneline 2>/dev/null || echo "no commits")
     echo "$name|$branch|$changes|$ahead|$behind|$last"
   '
   ```

4. **Format as a table**:

   | Project        | Branch         | Changes | Ahead/Behind | Last Commit                |
   | -------------- | -------------- | ------- | ------------ | -------------------------- |
   | verdant-web    | main           | 3 files | 0/0          | abc1234 fix: login bug     |
   | verdant_system | feature/AB#123 | clean   | 2/0          | def5678 feat: new endpoint |

5. **Highlight** any repos with uncommitted changes or that are behind remote

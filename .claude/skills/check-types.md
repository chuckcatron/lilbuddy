---
name: check-types
description: Run TypeScript type checking on any project
allowed-tools:
  - Bash
  - Read
  - Glob
---

# /check-types Skill

Run TypeScript type checking.

## Usage

```
/check-types              # Check current project
/check-types --strict     # Extra strict checking
```

## Instructions

1. **Detect project** — find the nearest tsconfig.json
2. **Run type check:**
   ```bash
   npx tsc --noEmit
   ```
   Or with specific tsconfig:
   ```bash
   npx tsc --noEmit -p tsconfig.json
   ```
3. **Report:** List all type errors grouped by file with file:line references

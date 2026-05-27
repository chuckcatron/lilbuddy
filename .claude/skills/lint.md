---
name: lint
description: Run linting on any Verdant project
allowed-tools:
  - Bash
  - Read
  - Glob
---

# /lint Skill

Run linting on any Verdant project.

## Usage

```
/lint              # Lint current project
/lint --fix        # Lint and auto-fix
/lint all          # Lint all projects
```

## Instructions

1. **Detect project** — find the nearest package.json and check for lint scripts

2. **Run the appropriate command**:

   | Project         | Lint Check           | Lint Fix                    |
   | --------------- | -------------------- | --------------------------- |
   | verdant-web     | `npm run lint:all`   | `npm run lint:all -- --fix` |
   | verdant-support | `npm run lint:check` | `npm run lint:fix`          |
   | verdant_system  | `npm run lint:check` | `npm run lint:fix`          |
   | CDK projects    | `npx eslint .`       | `npx eslint . --fix`        |

   If unsure, check `package.json` scripts for `lint`, `lint:check`, or `lint:fix`.

3. **For `all` mode** — run lint in each submodule that has a package.json:

   ```bash
   git submodule foreach 'if [ -f package.json ]; then npm run lint:check 2>/dev/null || npx eslint . 2>/dev/null || echo "No lint script found"; fi'
   ```

4. **Report results** — list errors/warnings grouped by file with file:line references

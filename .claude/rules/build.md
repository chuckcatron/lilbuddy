---
name: build
description: Build any Verdant project
allowed-tools:
  - Bash
  - Read
---

# /build Skill

Build any Verdant project.

## Usage

```
/build              # Build current project
/build all          # Build all projects
```

## Instructions

1. **Detect project** — find the nearest package.json

2. **Run the appropriate command**:

   | Project         | Build Command                                                                           |
   | --------------- | --------------------------------------------------------------------------------------- |
   | verdant-web     | `npm run build:all` (or `npm run verdant-next:build` / `npm run verdant-svelte3:build`) |
   | verdant-support | `npm run build:all`                                                                     |
   | verdant_system  | `npm run build`                                                                         |
   | CDK projects    | `npm run build` or `npx cdk synth`                                                      |

   If unsure, check `package.json` scripts for `build`, `build:all`, or `cdk synth`.

3. **For `all` mode** — build each submodule:

   ```bash
   git submodule foreach 'if [ -f package.json ]; then echo "=== Building $name ==="; npm run build 2>/dev/null || echo "No build script"; fi'
   ```

4. **Report** — success/failure per project, any build errors with file:line references

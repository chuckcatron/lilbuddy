---
name: test
description: Run tests for any project with optional coverage
allowed-tools:
  - Bash
  - Read
  - Glob
---

# /test Skill

Run tests for any Verdant project.

## Usage

```
/test                     # Run all tests
/test --coverage          # Run with coverage
/test ComponentName       # Run specific test file
```

## Instructions

1. **Detect test framework** — check for jest.config, vitest.config, or package.json test scripts
2. **Execute:**
   - Nx project: `nx test <project>` or `nx test <project> --coverage`
   - npm: `npm test` or `npm run test:cov`
   - Jest direct: `npx jest --testPathPattern="<pattern>"`
3. **Report:** Pass/fail summary, coverage percentages, failure details with file:line

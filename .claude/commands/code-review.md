Review code changes for quality, security, and standards compliance.

## Steps

### 1. Gather Changes

Run `git diff` (unstaged) and `git diff --cached` (staged) to collect all changes. If neither has changes, diff against the base branch: `git diff $(git merge-base HEAD main)...HEAD`.

### 2. Identify Affected Projects

Map changed files to Verdant projects using path prefixes (e.g., `verdant_system/`, `verdant-web/`). Load each project's CLAUDE.md if present for project-specific rules.

### 3. Review Against Standards

For each changed file, check:

#### TypeScript (strict mode projects)

- No `any` types introduced
- Explicit return types on exported functions
- Imports alphabetized
- Interfaces preferred over type aliases for object shapes
- No `@ts-ignore` or `@ts-expect-error` without justification

#### Security (OWASP Top 10)

- No hardcoded credentials, API keys, tokens, or connection strings
- No `password`, `secret`, `api_key` assignments with real values
- No AWS access keys (`AKIA...`)
- No SQL injection vectors (raw string interpolation in queries)
- No XSS vectors (unsanitized user input in HTML/templates)
- No command injection (unsanitized input in shell exec)
- CORS not widened to `*` without justification
- No `.env`, `.pem`, `.key`, or credential files staged

#### Testing

- New features have corresponding tests
- No `skip`, `xit`, `xdescribe`, or `test.skip` without documented reason
- Test assertions are meaningful (not just `toBeDefined`)
- No `maven.test.skip=true` introduced

#### Code Quality

- No console.log/console.error left in production code (use proper logger)
- No commented-out code blocks
- No TODO/FIXME without an AB# reference
- Error handling is appropriate (not swallowing errors silently)
- No over-engineering (unnecessary abstractions, premature generalization)
- Functions are reasonably sized and focused

#### Java/Spring Boot (if applicable)

- No `@CrossOrigin(origins = "*")` added
- Spring Boot version consistent with project's existing version
- No deprecated API usage without migration plan

#### Commit Hygiene

- Commit messages follow `type(AB#number): subject` format
- No merge commits in feature branch (should be rebased)
- No unrelated changes mixed into the diff

### 4. Run Diagnostics

For TypeScript projects with changes, run IDE diagnostics on changed files to catch type errors and lint violations the diff review might miss.

### 5. Output

Present findings in this format:

```
## Code Review Summary

**Files reviewed:** N files across M projects
**Verdict:** PASS | PASS WITH NOTES | NEEDS CHANGES

### Critical (must fix before merge)
- [file:line] Issue description

### Warnings (should fix)
- [file:line] Issue description

### Notes (optional improvements)
- [file:line] Suggestion

### Checklist
- [ ] No `any` types introduced
- [ ] No secrets or credentials committed
- [ ] TypeScript strict mode compliance
- [ ] Tests cover new/changed code
- [ ] No security vulnerabilities introduced
- [ ] Commit messages follow conventions
```

If no issues found, say so clearly — don't invent problems.

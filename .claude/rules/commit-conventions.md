# Commit Conventions

## Format

`type(AB#number): subject`

## Valid Types

feature, feat, bugfix, fix, build, chore, ci, docs, perf, refactor, revert, style, test, translation, security

## Examples

```
feature(AB#38944): add user authentication
bugfix(AB#38945): fix login validation error
chore(AB#38946): update dependencies
```

## Workflow

- Create feature branches for all changes — never push directly to main/master
- Commit frequently with descriptive messages
- Add and commit automatically when tasks complete
- Commits to master are blocked by husky — must use feature branches + PRs

## Rules

- Subject line: imperative mood, lowercase, no period
- AB# number is required — always reference the Azure DevOps work item
- The AB# reference in the scope position is required for Release Please automatic versioning
- Do NOT add Claude as a co-author (company policy)

## Pre-Commit Hook

The husky pre-commit hook runs these checks automatically on every commit:

1. `npm install`
2. `type-check`
3. `lint:fix`
4. `format:check`

If any step fails, the commit is rejected. Fix the issue and create a new commit (do NOT amend).

## Branch Naming

Feature branches: `feature/AB#<ticket>-description`

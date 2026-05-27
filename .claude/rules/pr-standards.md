# Pull Request Standards

## PR Title

Format: `type(AB#number): brief description`

Same format as commit messages. Keep under 70 characters.

## PR Description Template

Every PR should include:

### Summary

- 1-3 bullet points describing what changed and why

### Azure DevOps

- AB#XXXXX — link to the work item

### Test Plan

- [ ] Unit tests pass
- [ ] Coverage meets threshold (80%)
- [ ] Manual testing steps (if applicable)

### Review Checklist

- [ ] No `any` types introduced
- [ ] No secrets or credentials committed
- [ ] TypeScript strict mode compliance
- [ ] Tests cover new/changed code

## Review Expectations

- All PRs require at least 1 reviewer
- Reviewer should check: correctness, test coverage, security, AB# linkage
- Address all comments before merging
- Squash merge to keep history clean

## Versioning

- Release Please auto-creates version bump PRs on master push
- `feature`/`feat` commits → minor bump, `bugfix`/`fix` → patch bump
- Merging the Release PR creates a git tag and GitHub Release

## Hotfixes

- `gh pr merge --admin --squash` bypasses branch protection when needed
- Never admin-merge without verifying: `npm view <pkg>@<version>` for new deps, wait for CI, or test Docker build locally

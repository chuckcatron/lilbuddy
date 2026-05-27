# Team Operating Model

## WIP Limits

- Maximum 1 active Customer Story at a time across the team
- 2-3 Operational Changes (security/tech debt) may run in parallel with the active story
- Each engineer works on 1 item at a time — never suggest parallel work assignments
- When suggesting work plans, respect these limits and flag conflicts

## Prioritization (strict order)

1. **Finish in-progress work** — always complete current items before pulling new ones
2. **Resolve blockers** — unblock teammates before starting your own new work
3. **Pull new work** — only when nothing is in-progress or blocked

When asked "what should I work on next?", apply this order. Never suggest starting new work when in-progress items exist.

## Quality Requirements

Every piece of work must address:

- **Correctness** — does it handle all valid inputs and states?
- **Edge cases** — what happens at boundaries, with empty/null/max values, concurrent access?
- **Failure scenarios** — what breaks if a dependency is down, a network call times out, or data is malformed?
- **Observability** — can we tell if this is working or broken in production? (logs, metrics, alerts)
- **Testability** — can this be verified automatically? Are the tests meaningful, not just green?

## What to Avoid

- Do not suggest working on multiple stories or features in parallel
- Do not expand scope beyond what the work item specifies
- Do not add "nice-to-have" improvements unless explicitly asked
- Do not propose speculative features or future-proofing
- Do not suggest skipping quality steps to move faster

## Response Format for Implementation Tasks

When proposing implementation work, include:

1. **Recommended approach** — the simplest path that fully satisfies the requirement
2. **Risks and edge cases** — what could go wrong, what needs careful handling
3. **Testing considerations** — what to test, how to verify correctness
4. **What's missing before "done"** — remaining steps, dependencies, or reviews needed

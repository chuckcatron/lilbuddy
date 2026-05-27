---
name: enrich
description: Enrich an AZDO story with code-grounded implementation details — investigates the codebase, validates claims, builds implementation guide, updates the story
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
  - Agent
  - Write
  - AskUserQuestion
  - TodoWrite
---

# /enrich Skill

Enrich an Azure DevOps story with code-grounded implementation details by investigating the verdant-root codebase.

## Usage

```
/enrich              # Prompts for card number
/enrich 41671        # Enrich AB#41671
```

## What It Does

1. Fetches the AZDO story
2. Identifies target repos and tech stack from the story content
3. Deep-dives the codebase: entities, DTOs, Redis keys, API endpoints, message protocols, CDK patterns
4. Validates every technical claim in the story against actual code
5. Builds an Implementation Guide with exact file paths, field mappings, and patterns to follow
6. Updates the AZDO story description and acceptance criteria (with user approval)
7. Updates the mirror task to match

## When to Use

- After creating stories (via sprint planning scripts) that need implementation detail
- When a story references technical concepts that need code verification
- When you need to understand what fields/APIs/services actually exist before committing to a design
- Before running `/contract` — enriching first produces better contracts

## Instructions

Follow the full instructions in `.claude/commands/enrich.md`. That file is the single source of truth for the enrichment process.

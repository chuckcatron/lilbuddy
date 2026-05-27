---
name: contract
description: Generate a pre-filled Prompt Contract from an AZDO work item — auto-detects story type, tech stack, verification commands, and pattern references
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

# /contract Skill

Generate a Prompt Contract from an Azure DevOps work item — auto-detects story type, tech stack, verification commands, and pattern references.

## Usage

```
/contract              # Prompts for card number
/contract 41000        # Generate contract for AB#41000
```

## Instructions

Follow the full instructions in `.claude/commands/contract.md`. That file is the single source of truth for the contract generation process.

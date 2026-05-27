Restore session context efficiently — read the index only, not the full playbooks.

Where $MEMORY_DIR is /Users/chuckcatron/.claude/projects/-Users-chuckcatron-projects-verdant-root/memory

1. Read $MEMORY_DIR/MEMORY.md (the index — this is all you need for session context)

Do NOT proactively read azdo-playbook.md or snyk-playbook.md. They are large reference documents (500+ lines each) and should only be read on demand when actually performing AZDO story creation or Snyk work. Note their existence to the user but do not load them.

2. Check for active pairing context files:

```bash
ls /Users/chuckcatron/Library/CloudStorage/OneDrive-Copeland/Verdant-Pairing/*/context.md 2>/dev/null
```

For each context file found, extract only the phase line — do NOT read the full file unless the user asks:

```bash
for f in /Users/chuckcatron/Library/CloudStorage/OneDrive-Copeland/Verdant-Pairing/*/context.md; do
  ab=$(basename $(dirname "$f"))
  phase=$(grep -m1 "Phase:" "$f" 2>/dev/null | sed 's/.*Phase: //')
  echo "$ab — $phase"
done
```

After running, report:

- Loaded: MEMORY.md (the index)
- Available on demand: azdo-playbook.md, snyk-playbook.md
- Active stories: list each AB# with its phase (one line each)

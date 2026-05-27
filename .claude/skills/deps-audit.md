---
name: deps-audit
description: Audit dependencies for vulnerabilities and outdated packages
allowed-tools:
  - Bash
  - Read
  - Glob
  - mcp__Snyk__snyk_sca_scan
---

# /deps-audit Skill

Check dependency health across Verdant projects.

## Usage

```
/deps-audit                # Audit current project
/deps-audit all            # Audit all projects
/deps-audit --outdated     # Show outdated packages only
/deps-audit --security     # Security vulnerabilities only (via Snyk)
```

## Instructions

1. **Parse arguments**:
   - No args: audit current project (npm audit + outdated)
   - `all`: loop through all submodules
   - `--outdated`: only check for outdated packages
   - `--security`: only check for vulnerabilities using Snyk MCP

2. **For each project**:

   **Outdated check**:

   ```bash
   npm outdated --long 2>/dev/null || echo "No outdated packages"
   ```

   **Security check** (prefer Snyk MCP if available):

   ```
   Use mcp__Snyk__snyk_sca_scan with the project path
   ```

   Fallback:

   ```bash
   npm audit --omit=dev 2>/dev/null
   ```

3. **For `all` mode**:

   ```bash
   git submodule foreach 'if [ -f package.json ]; then echo "=== $name ==="; npm outdated 2>/dev/null; npm audit --omit=dev 2>/dev/null; fi'
   ```

4. **Report**:

   | Project        | Outdated   | Vulnerabilities | Action Needed          |
   | -------------- | ---------- | --------------- | ---------------------- |
   | verdant-web    | 5 packages | 2 high          | Update lodash, fix XSS |
   | verdant_system | 3 packages | 0               | Minor updates only     |

   Prioritize: Critical/High vulnerabilities first, then outdated major versions.

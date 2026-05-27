---
name: security-scan
description: Run Snyk security scans on any project in the workspace
allowed-tools:
  - mcp__Snyk__snyk_code_scan
  - mcp__Snyk__snyk_sca_scan
  - mcp__Snyk__snyk_iac_scan
  - Read
  - Glob
---

# /security-scan Skill

Run Snyk security scans on any Verdant project.

## Usage

```
/security-scan                    # Scan current project
/security-scan code               # SAST scan only
/security-scan deps               # SCA/dependency scan only
/security-scan --severity high    # Only high+ severity
```

## Instructions

1. **Determine project path** — use current working directory or specified project
2. **Execute scans:**
   - SAST: `mcp__Snyk__snyk_code_scan` with project path
   - SCA: `mcp__Snyk__snyk_sca_scan` with project path
   - IaC: `mcp__Snyk__snyk_iac_scan` for CDK projects
3. **Report:** List vulnerabilities by severity with file:line references and remediation steps

## Scan Types

- **SAST**: SQL injection, XSS, command injection, OWASP Top 10
- **SCA**: Known CVEs, outdated packages, license issues
- **IaC**: Infrastructure misconfigurations (CDK projects)

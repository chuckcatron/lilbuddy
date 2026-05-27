# No Secrets in Version Control

## Forbidden Files

NEVER commit or stage these files:

- `.env`, `.env.*` (except `.env.example`)
- `credentials.md`, `credentials.json`, `credentials.yml`
- `*.pem`, `*.key`, `*.p12`, `*.pfx`
- Files containing API keys, tokens, passwords, or connection strings

## Detection

If you encounter any of these patterns in staged changes, **stop and warn the user**:

- `password`, `secret`, `api_key`, `apikey`, `token` as variable assignments with actual values
- AWS access keys (`AKIA...`)
- Connection strings with embedded credentials
- Base64-encoded credentials

## Safe Alternatives

- Use `.env.example` with placeholder values for documentation
- Reference credentials from environment variables or secrets managers
- Use `.claude/credentials.md` for local-only credential storage (already in .gitignore)

## Exceptions

- `.env.example` files with placeholder values are OK
- Test fixtures with obviously fake credentials (e.g., `test-password-123`) are OK
- Documentation referencing credential patterns without actual values is OK

# Setup Verdant Workspace

Initialize all submodules and install dependencies for the Verdant platform.

## Preferred Method

Run the setup script — it handles SSH URL rewriting, submodule init, and branch checkout:

```bash
./scripts/setup.sh
```

## What the Script Does

1. Configures local SSH URL rewrite (`.gitmodules` uses HTTPS, but devs authenticate via SSH)
2. Initializes and clones all 30 submodules
3. Checks out each submodule's tracked branch (configured in `.gitmodules`) so devs land on a real branch, not detached HEAD
4. Installs Node/TypeScript dependencies for applicable projects

## Manual Steps (if not using the script)

1. Configure SSH rewrite and initialize submodules:

   ```bash
   git config --local url."git@github.com:".insteadOf "https://github.com/"
   git submodule update --init --recursive
   ```

2. Check out tracked branches:

   ```bash
   git submodule foreach 'branch=$(git config -f "$toplevel/.gitmodules" submodule.$name.branch); git checkout "$branch" 2>/dev/null'
   ```

3. Install verdant-web dependencies (dual install required):

   ```bash
   cd verdant-web && npm install
   cd verdant-web/apps/verdant-svelte3 && npm install
   ```

4. Install other project dependencies:

   ```bash
   cd verdant-support && npm install
   cd verdant_system/verdant_system && npm install
   cd verdant_network && npm install
   cd verdant_vtm_cdk && npm install
   ```

5. verdant_web_thermostat_solutions (PHP) — no npm install needed

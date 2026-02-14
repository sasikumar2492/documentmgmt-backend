# Push your changes – quick guide

Your repo: **documentmgmt-backend**  
Remote: **origin** → `https://github.com/sasikumar2492/documentmgmt-backend.git`  
Current branch: **dev/Vijay/backend**

---

## Step 1: Go to the repo folder

```bash
cd d:\Lamp Projects\DMS\Pharma-DMS\documentmgmt-backend
```

---

## Step 2: Stage everything you want to push

Stage all project files (`.gitignore` will keep `node_modules` and `.env` from being added):

```bash
git add .
```

Check what will be committed (optional):

```bash
git status
```

You should **not** see `node_modules` or `.env` in the list. If you do, your `.gitignore` in this folder is correct and they will be ignored.

---

## Step 3: Commit

```bash
git commit -m "Phase 1: auth API, Prisma schema, seed, .gitignore; stop tracking node_modules"
```

Use your own message if you prefer.

---

## Step 4: Push to GitHub

Push your branch to `origin`:

```bash
git push -u origin dev/Vijay/backend
```

- First time pushing this branch: `-u` sets `origin/dev/Vijay/backend` as upstream so next time you can use `git push` only.
- If the branch already has an upstream: `git push` is enough.

---

## If you get errors

- **"Updates were rejected"** – Someone else pushed to the same branch. Pull first, then push:
  ```bash
  git pull origin dev/Vijay/backend
  git push origin dev/Vijay/backend
  ```
- **Authentication failed** – Use a Personal Access Token (PAT) instead of password, or SSH. In GitHub: Settings → Developer settings → Personal access tokens.
- **Remote not found** – Check remote: `git remote -v`. Add if needed: `git remote add origin <repo-url>`.

---

## After pushing

- Open the repo on GitHub and confirm your branch and latest commit.
- Others can pull with: `git pull origin dev/Vijay/backend` (or merge your branch via a Pull Request).

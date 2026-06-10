Run `git diff --cached` to see what is staged, and `git log --oneline -5` to see recent commit style.

Before writing the commit message, run the relevant checks for whatever changed and fix any errors first (do not fix unrelated warnings):

- `backend/` changes: `cd backend && npx tsc --noEmit && npm test`
- `frontend/` changes: `cd frontend && npm test && npx ng build`

Once the staged changes are clean, write a concise commit message that:

1. Starts with a verb (add, update, fix, refactor, remove)
2. Focuses on **why** the change was made, not what files changed
3. Keeps the subject line under 72 characters
4. Adds a body only if the change needs explanation beyond the subject line

Output the commit message in chat for the user to run themselves. Do NOT run git commit.

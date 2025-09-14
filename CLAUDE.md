# CLAUDE.md

## Commit messages
Follow the Conventional Commits specification.
Write commit messages in English. Start the sentence with a lowercase letter, do not end with a period, and aim for 50 characters or fewer.

## Pull Requests
Write the Pull Request title and description in Japanese.
The title should concisely state what this Pull Request changes.
In the Pull Request description, explain why the chosen approach was adopted.
Use the `gh` command to create Pull Requests.
You should be already authenticated to GitHub; confirm with `gh auth status`.
When writing the Pull Request body, avoid using `\n` for line breaks (GitHub will not render them as new lines). Use an EOF-style delimiter to include explicit newlines instead.

## Commands

The `gh` CLI is available.
You may run read-only `gh` commands such as `gh view` without asking for confirmation.

```bash
# Linter, formatter, type checks
pnpm check
```

```bash
# End-to-end tests
pnpm e2e
```

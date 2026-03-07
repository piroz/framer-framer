# CLAUDE.md

## Git commit / PR rules

- コミットメッセージに `https://claude.ai/code/session_*` URL を含めないこと
- PR タイトル・本文にもセッション URL を含めないこと
- PRは origin に対して作成すること

## Commit conventions

Use conventional commits. release-please uses these to auto-generate changelogs and determine version bumps.

Format: `<type>(<scope>): <description>`

Types:
- `feat:` — new feature (minor bump)
- `fix:` — bug fix (patch bump)
- `feat!:` / `fix!:` — breaking change (major bump)
- `docs:` — documentation only
- `ci:` — CI/workflow changes
- `chore:` — maintenance tasks
- `refactor:` — code restructuring without behavior change
- `test:` — adding or updating tests

## Release flow

Releases are managed by release-please. Do not manually edit version in package.json or CHANGELOG.md.

1. Merge feature PRs to master with conventional commit messages
2. release-please auto-creates/updates a Release PR
3. Merge the Release PR when ready to release → tag + npm publish

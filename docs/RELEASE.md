# Release & Semantic Versioning

This project uses [Conventional Commits](https://www.conventionalcommits.org/) and [standard-version](https://github.com/conventional-changelog/standard-version) for semantic versioning and automatic changelog generation.

## Commit Format

All commits must follow this format:

```
type(scope): description
```

### Types

| Type | Description | Version Bump |
|------|-------------|--------------|
| `feat` | New feature | Minor (0.x.0) |
| `fix` | Bug fix | Patch (0.0.x) |
| `chore` | Maintenance, dependencies | None |
| `build` | Build system changes | None |
| `ci` | CI configuration | None |
| `docs` | Documentation only | None |
| `style` | Code style (formatting, etc.) | None |
| `refactor` | Code change that neither fixes a bug nor adds a feature | None |
| `perf` | Performance improvement | None |
| `test` | Adding or fixing tests | None |

### Examples

```bash
git commit -m "feat: add bulk player import"
git commit -m "fix: draft board not advancing on duplicate pick"
git commit -m "chore: reorder default scoring rules"
git commit -m "docs: update release guide"
```

For breaking changes, add `!` after the type or include `BREAKING CHANGE:` in the commit body:

```bash
git commit -m "feat!: redesign draft board layout"
```

## Releasing

```bash
# First release (creates CHANGELOG.md, tags v0.1.0)
npm run release:first

# Auto-bump based on commits (feat → minor, fix → patch)
npm run release

# Force a specific bump
npm run release:minor
npm run release:major
```

Each release:
1. Bumps the version in `package.json`
2. Updates `CHANGELOG.md` with commit history
3. Creates a git commit and version tag

## Enforcement

Commit messages are validated on every commit via a `commit-msg` git hook (husky + commitlint). Non-conforming messages will be rejected.

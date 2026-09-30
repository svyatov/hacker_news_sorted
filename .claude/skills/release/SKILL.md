---
name: release
description: Guide the release process — version bump, changelog finalization, description.txt update, build, and package
disable-model-invocation: true
---

# Release

Walk through each step, confirming the version number with the user before starting.

## Steps

1. **Determine version**: Read `package.json` for current version. Ask the user for the new version (patch/minor/major or explicit number).

2. **Bump version**: Update `version` in `package.json`.

3. **Finalize changelog**: In `CHANGELOG.md`, rename `## [Unreleased]` to `## [<version>] - <today's date>` (YYYY-MM-DD format). Add a fresh empty `## [Unreleased]` section above it. Make sure changelog contains only changes between releases, not intermediate commits.

4. **Update description.txt**: Add `YYYY-MM-DD - vX.Y.Z - summary` (today's date, a short non-technical summary) as the first line under `Recent changes:`, and delete the oldest line so 5 remain.

5. **Update README.md**: If the release includes user-facing feature changes, update relevant sections.

6. **Build and package**: Run `bun run release` (builds and packages the extension). Verify it succeeds.

7. **Commit**: On a new branch `chore/release-<version>`, create a single commit with message `chore: release v<version>` containing all changed files.

8. **Pull request**: Push the branch and open a PR titled `chore: release v<version>`. Squash-merge it once CI passes and the user approves.

9. **Tag**: Pull `main`, create a git tag `v<version>` on the squash-merge commit, and push the tag.

10. **GitHub release**: `gh release create v<version> --title v<version>` with notes set to the version's `CHANGELOG.md` section body (its `### ...` categories), followed by `**Full changelog:** https://github.com/svyatov/hacker_news_sorted/blob/v<version>/CHANGELOG.md`.

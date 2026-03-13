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

4. **Update description.txt**: Add a one-line entry to the `Changelog:` section with the new version, month/year, and a short non-technical summary. Insert it as the first changelog line (below the `Changelog:` header).

5. **Update README.md**: If the release includes user-facing feature changes, update relevant sections.

6. **Build and package**: Run `bun run release` (builds and packages the extension). Verify it succeeds.

7. **Commit**: Create a single commit with message `chore: release v<version>` containing all changed files.

8. **Tag**: Create a git tag `v<version>` on the release commit.

9. **Push**: Push everything and create GitHub release.
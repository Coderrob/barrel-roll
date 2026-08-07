# Ideas

This backlog contains only ideas that would materially improve Barrel Roll's core job: generating
correct, predictable TypeScript barrel files from VS Code.

## Configurable exclusion patterns

Allow users to add workspace-specific file and directory exclusions through a
`barrelRoll.exclude` setting. The configured patterns would supplement the safe built-in exclusions
for generated output, dependencies, declarations, and tests.

Example:

```json
{
  "barrelRoll.exclude": ["**/__fixtures__/**", "**/internal/**", "**/*.generated.ts"]
}
```

This would improve utility for monorepos, generated-code workflows, and projects with private
implementation folders without changing the default behavior.

Acceptance criteria:

- Support standard workspace-relative glob patterns for files and directories.
- Apply exclusions consistently to single-directory and recursive generation.
- Keep the existing built-in safety exclusions enabled.
- Validate malformed settings and report them through the extension output channel.
- Add contract tests for nested exclusions, file exclusions, Windows paths, and overlapping
  patterns.

Do not infer exclusions from `.gitignore`. Git tracking and public API generation have different
semantics, and partial `.gitignore` support would create surprising behavior. Users who want the
same patterns can add them explicitly to `barrelRoll.exclude`.

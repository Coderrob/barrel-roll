# Ideas & Future Enhancements

This document captures potential improvements and feature ideas for future consideration.

---

## 🔮 Proposed Ideas

### Dynamic `.gitignore` Integration

**Status**: Deferred  
**Priority**: Low  
**Complexity**: Medium

**Description**:  
Instead of relying solely on hardcoded ignored directories, parse `.gitignore` files to dynamically determine which directories to skip during barrel generation.

**Current Approach**:  
Hardcoded `IGNORED_DIRECTORIES` set in `src/core/io/file-system.service.ts` covers common cases (node_modules, dist, coverage, etc.).

**Proposed Approach**:

1. Read `.gitignore` at workspace root during barrel generation
1. Extract simple directory names (lines without wildcards, negations, or path separators)
1. Merge with hardcoded defaults

**Implementation Options**:

| Option               | Pros                             | Cons                    |
| -------------------- | -------------------------------- | ----------------------- |
| Add `ignore` package | Battle-tested, correct semantics | New dependency (~30KB)  |
| Simple line matching | Zero dependencies, fast          | Misses complex patterns |
| Hybrid approach      | Best of both worlds              | Partial coverage        |

**Sample Implementation** (hybrid):

```typescript
async function loadIgnoredDirectories(workspaceRoot: string): Promise<Set<string>> {
  const defaults = new Set([
    /* hardcoded list */
  ]);

  try {
    const gitignorePath = path.join(workspaceRoot, '.gitignore');
    const content = await fs.readFile(gitignorePath, 'utf-8');

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      // Skip comments, negations, and patterns with wildcards
      if (
        !trimmed ||
        trimmed.startsWith('#') ||
        trimmed.startsWith('!') ||
        trimmed.includes('*') ||
        trimmed.includes('/')
      ) {
        continue;
      }
      defaults.add(trimmed);
    }
  } catch {
    // No .gitignore or unreadable - use defaults only
  }

  return defaults;
}
```

**Why Deferred**:
The hardcoded list covers 99% of real-world cases. The overhead of proper `.gitignore` parsing adds complexity and potential maintenance burden without significant user benefit.

**Revisit When**:

- Users report missing common directories
- A lightweight, well-maintained gitignore parser becomes available
- Extension gains configuration options for custom ignore patterns

---

## ✅ Implemented Ideas

_Ideas that have been implemented will be moved here with a link to the relevant PR or commit._

---

## 📝 How to Add Ideas

Use the following template:

```markdown
### [Idea Title]

**Status**: Proposed | In Progress | Deferred | Rejected  
**Priority**: Low | Medium | High  
**Complexity**: Low | Medium | High

**Description**:  
[What is the idea?]

**Current Approach**:  
[How does the extension handle this today?]

**Proposed Approach**:  
[How would this idea change things?]

**Why [Status]**:  
[Rationale for the current status]

**Revisit When**:  
[Conditions that would make this worth reconsidering]
```

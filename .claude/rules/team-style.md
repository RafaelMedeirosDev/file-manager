# Team Style

Use these rules for implementation choices, explanations, and reviews.

## Priorities
- Simplicity over excess abstraction.
- Clarity over magic.
- Consistency over unnecessary creativity.
- Small, easy-to-maintain solutions over broad framework-like refactors.

## Code style
- Prefer explicit names such as `selectedDeleteFolderId` over vague names such as `selectedId`.
- Avoid `any`. Narrow the type or introduce a small local interface instead.
- Avoid helpers with vague names or unclear reuse, such as `processData`, `handleThing`, or `buildCommonPayload`.
- Favor straight-line code and local reasoning over deep indirection.

Do this:
```ts
const normalizedEmail = input.email.trim().toLowerCase();
```

Avoid this:
```ts
const value = normalize(input);
```

## Refactors
- For a specific bug, start with the minimum safe correction.
- For a larger refactor, explain:
  1. the current root cause or maintenance problem
  2. the affected files or layers
  3. the behavior and test risk
- Do not rename or move files just for taste.

## Explanations and reviews
- When explaining a change, state the root cause before the fix.
- When reviewing code, lead with concrete findings and file impact.
- If the repo already has a local pattern that works, follow it unless it clearly harms correctness or maintainability.

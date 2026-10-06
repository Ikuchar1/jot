---
paths:
  - "ui/**"
---
# Working in ui/
Follow CONVENTIONS.md "UI Rules" (all 10). On top of those:
- `src/api/generated/` is orval output: read it to find hook and type names, never edit it.
- A feature's mutation wrapper (like `todos/useSetDone.ts`) owns optimistic updates: `onMutate` cancels the list query and patches the cache, `onError` undoes only its own change, `onSettled` calls `resyncTodos`. Copy that shape.
- For MUI styling (`sx`, `styled()`, theme overrides), use the `material-ui-styling` skill.
- Prettier: no semicolons, single quotes, 120 wide. Run `npm run format` rather than formatting by hand.
- UI text uses the glossary: Todo, List, Done.

## Where tests go
Next to the component (`src/<feature>/*.test.tsx`), with `renderWithProviders` and MSW handlers for every request (a request with no handler fails the test). Find elements by role and visible text. Never mock hooks or `fetch`. Name tests after behavior, in the glossary's words: "adding a Todo with a blank title shows the error", not "AddAsync throws".

## Running one test
`npx vitest run src/todos/TodosPage.test.tsx -t "blank"` (in ui/)

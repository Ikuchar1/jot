---
paths:
  - "api/**"
---
# Working in api/
Follow CONVENTIONS.md "API Rules" (all 11). On top of those:
- Every action takes `CancellationToken ct` and passes it to the orchestrator and to every EF async call.
- Every action declares its responses with `[ProducesResponseType]`, errors as `[ProducesResponseType<ProblemDetails>(code, "application/problem+json")]`, so the OpenAPI doc and orval types are right.
- Status codes: GET 200; create 201 (`Created((string?)null, dto)` until a get-one endpoint exists); update 200 with the DTO; a broken rule 400 (`BrokenRuleException`); a missing id 404 (`NotFoundException`). Both exceptions live in `Errors/`, and their message is the user-facing `detail`.
- Orchestrators take request DTOs and return response DTOs; entities never leave them.
- After changing a controller or DTO, run `dotnet build` so `Jot.Api.json` is rewritten, then `npm run generate` in `ui/`.
- Ignore generic ASP.NET advice that conflicts with this repo: no service or repository layer, no DataAnnotations validation, no `Middleware/` folder.

## Where tests go
`api/Jot.Api.Tests/`, through HTTP with `JotApiFactory` (a real Postgres via Testcontainers, so Docker must be running). Assert on status codes, response bodies and ProblemDetails `detail` text. Never query the database directly in a test, and never mock the DbContext or an orchestrator. Name tests after behavior, in the glossary's words.

## Running one test
- `dotnet test --filter-class "*TodosTests*"` (in api/)
- `dotnet test --filter-method "*Blank*"` (in api/)

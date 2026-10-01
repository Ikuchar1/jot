namespace Jot.Api.Tests;

// The ProblemDetails JSON every error comes back as, kept apart from ASP.NET's ProblemDetails class so a breaking
// change to the shape callers see fails here
internal sealed record ProblemJson(int Status, string Title, string? Detail);

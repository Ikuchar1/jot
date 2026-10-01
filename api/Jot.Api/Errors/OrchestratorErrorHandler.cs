using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Jot.Api.Errors;

// Turns the exceptions orchestrators throw on purpose into ProblemDetails with the exception's message as its detail:
// a broken rule is a 400, something that doesn't exist a 404. Any other exception falls through to
// UseExceptionHandler's default: a 500 ProblemDetails that hides it.
public class OrchestratorErrorHandler(IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken ct)
    {
        int? status = exception switch
        {
            BrokenRuleException => StatusCodes.Status400BadRequest,
            NotFoundException => StatusCodes.Status404NotFound,
            _ => null,
        };
        if (status is null)
        {
            return false;
        }

        httpContext.Response.StatusCode = status.Value;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            // The title ("Bad Request", "Not Found") is filled in from the status code
            ProblemDetails = new ProblemDetails { Detail = exception.Message },
        });
    }
}

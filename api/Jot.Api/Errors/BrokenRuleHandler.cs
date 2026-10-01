using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Jot.Api.Errors;

// Turns a broken rule into a 400 ProblemDetails with the rule's message as its detail. Any other exception falls
// through to UseExceptionHandler's default: a 500 ProblemDetails that hides it.
public class BrokenRuleHandler(IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken ct)
    {
        if (exception is not BrokenRuleException)
        {
            return false;
        }

        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            // The title ("Bad Request") is filled in from the status code
            ProblemDetails = new ProblemDetails { Detail = exception.Message },
        });
    }
}

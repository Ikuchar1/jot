using System.Net;
using System.Text.Json;
using Jot.Api.Orchestrators;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace Jot.Api.Tests;

public class ErrorTests(JotApiFactory api)
{
    // Tests run in Development, where ASP.NET's developer error page would include the stack trace
    [Fact]
    public async Task An_unhandled_exception_returns_a_500_problem_details_without_the_stack_trace()
    {
        var ct = TestContext.Current.CancellationToken;
        // Any exception the API doesn't expect will do; this one is thrown while the controller is being created
        await using var broken = api.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
            services.AddScoped<TodoOrchestrator>(_ => throw new InvalidOperationException("Secret internals"))));

        var response = await broken.CreateClient().GetAsync("/api/todos", ct);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadAsStringAsync(ct);
        Assert.DoesNotContain("Secret internals", body);
        Assert.DoesNotContain(nameof(InvalidOperationException), body);
        Assert.Equal(500, JsonSerializer.Deserialize<ProblemJson>(body, JsonSerializerOptions.Web)!.Status);
    }
}

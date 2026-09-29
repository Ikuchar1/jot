using Microsoft.AspNetCore.Hosting;

namespace Jot.Api.Tests;

// The UI runs on its own port and calls the API directly, so the browser sends a CORS preflight first
public class CorsTests(JotApiFactory api)
{
    private readonly HttpClient _client = api.CreateClient();

    // Each worktree runs its UI on its own port (see dev.sh)
    [Theory]
    [InlineData("http://localhost:5173")]
    [InlineData("http://localhost:5175")]
    public async Task A_ui_dev_server_on_any_localhost_port_may_call_the_api(string origin)
    {
        var response = await SendPreflight(_client, origin);

        Assert.Equal(origin, Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin")));
    }

    [Fact]
    public async Task Other_sites_may_not_call_the_api()
    {
        var response = await SendPreflight(_client, "https://evil.example");

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task Outside_development_only_the_configured_origins_may_call_the_api()
    {
        await using var production = api.WithWebHostBuilder(builder => builder
            .UseEnvironment("Production")
            .UseSetting("Cors:AllowedOrigins:0", "https://jot.example"));
        var client = production.CreateClient();

        var configured = await SendPreflight(client, "https://jot.example");
        var localhost = await SendPreflight(client, "http://localhost:5175");

        Assert.True(configured.Headers.Contains("Access-Control-Allow-Origin"));
        Assert.False(localhost.Headers.Contains("Access-Control-Allow-Origin"));
    }

    private static Task<HttpResponseMessage> SendPreflight(HttpClient client, string origin)
    {
        var preflight = new HttpRequestMessage(HttpMethod.Options, "/api/todos");
        preflight.Headers.Add("Origin", origin);
        preflight.Headers.Add("Access-Control-Request-Method", "POST");
        preflight.Headers.Add("Access-Control-Request-Headers", "content-type");
        return client.SendAsync(preflight, TestContext.Current.CancellationToken);
    }
}

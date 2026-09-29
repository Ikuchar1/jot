namespace Jot.Api.Tests;

// The UI runs on its own port and calls the API directly, so the browser sends a CORS preflight first
public class CorsTests(JotApiFactory api)
{
    private readonly HttpClient _client = api.CreateClient();

    [Fact]
    public async Task The_ui_dev_server_may_call_the_api()
    {
        var response = await SendPreflightFrom("http://localhost:5173");

        Assert.Equal("http://localhost:5173", Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin")));
    }

    [Fact]
    public async Task Other_sites_may_not_call_the_api()
    {
        var response = await SendPreflightFrom("https://evil.example");

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    private Task<HttpResponseMessage> SendPreflightFrom(string origin)
    {
        var preflight = new HttpRequestMessage(HttpMethod.Options, "/api/todos");
        preflight.Headers.Add("Origin", origin);
        preflight.Headers.Add("Access-Control-Request-Method", "POST");
        preflight.Headers.Add("Access-Control-Request-Headers", "content-type");
        return _client.SendAsync(preflight, TestContext.Current.CancellationToken);
    }
}

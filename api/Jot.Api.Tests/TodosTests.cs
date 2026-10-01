using System.Net;
using System.Net.Http.Json;

namespace Jot.Api.Tests;

public class TodosTests(JotApiFactory api)
{
    private readonly HttpClient _client = api.CreateClient();

    [Fact]
    public async Task Added_todo_shows_up_in_the_list()
    {
        var ct = TestContext.Current.CancellationToken;
        var id = Guid.CreateVersion7();

        var added = await _client.PostAsJsonAsync("/api/todos", new { id, title = "Buy milk" }, ct);
        Assert.Equal(HttpStatusCode.Created, added.StatusCode);

        var todos = await _client.GetFromJsonAsync<List<TodoJson>>("/api/todos", ct);
        Assert.Contains(new TodoJson(id, "Buy milk"), todos!);
    }

    [Fact]
    public async Task Todo_added_without_an_id_gets_a_uuid_v7()
    {
        var ct = TestContext.Current.CancellationToken;

        var added = await _client.PostAsJsonAsync("/api/todos", new { title = "Call the dentist" }, ct);
        Assert.Equal(HttpStatusCode.Created, added.StatusCode);

        var todo = await added.Content.ReadFromJsonAsync<TodoJson>(ct);
        Assert.Equal(7, todo!.Id.Version);

        var todos = await _client.GetFromJsonAsync<List<TodoJson>>("/api/todos", ct);
        Assert.Contains(todo, todos!);
    }

    // The UI won't send a blank title, but MCP and Siri callers don't have the UI's checks
    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Todo_with_a_blank_title_is_rejected_with_a_400_problem_details(string title)
    {
        var ct = TestContext.Current.CancellationToken;

        var response = await _client.PostAsJsonAsync("/api/todos", new { title }, ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<ProblemJson>(ct);
        Assert.Equal(new ProblemJson(400, "Bad Request", "A todo needs a title."), problem);
    }

    // The JSON the UI sees, kept apart from the API's DTO so a breaking change to the contract fails here
    private sealed record TodoJson(Guid Id, string Title);
}

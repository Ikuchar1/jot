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
        Assert.Contains(new TodoJson(id, "Buy milk", Done: false), todos!);
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

    [Fact]
    public async Task Completed_todo_shows_as_done_in_the_list()
    {
        var ct = TestContext.Current.CancellationToken;
        var id = Guid.CreateVersion7();
        await _client.PostAsJsonAsync("/api/todos", new { id, title = "Pay rent" }, ct);

        var response = await _client.PutAsJsonAsync($"/api/todos/{id}/done", new { done = true }, ct);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var todos = await _client.GetFromJsonAsync<List<TodoJson>>("/api/todos", ct);
        Assert.Contains(new TodoJson(id, "Pay rent", Done: true), todos!);
    }

    [Fact]
    public async Task Uncompleted_todo_shows_as_not_done_again()
    {
        var ct = TestContext.Current.CancellationToken;
        var id = Guid.CreateVersion7();
        await _client.PostAsJsonAsync("/api/todos", new { id, title = "Water the plants" }, ct);
        await _client.PutAsJsonAsync($"/api/todos/{id}/done", new { done = true }, ct);

        var response = await _client.PutAsJsonAsync($"/api/todos/{id}/done", new { done = false }, ct);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var todos = await _client.GetFromJsonAsync<List<TodoJson>>("/api/todos", ct);
        Assert.Contains(new TodoJson(id, "Water the plants", Done: false), todos!);
    }

    [Fact]
    public async Task List_shows_todos_not_done_first_then_done_ones_most_recently_done_first()
    {
        var ct = TestContext.Current.CancellationToken;
        var (first, second, third) = (Guid.CreateVersion7(), Guid.CreateVersion7(), Guid.CreateVersion7());
        foreach (var id in new[] { first, second, third })
        {
            await _client.PostAsJsonAsync("/api/todos", new { id, title = "Read a chapter" }, ct);
        }

        await _client.PutAsJsonAsync($"/api/todos/{first}/done", new { done = true }, ct);
        await _client.PutAsJsonAsync($"/api/todos/{third}/done", new { done = true }, ct);

        var todos = await _client.GetFromJsonAsync<List<TodoJson>>("/api/todos", ct);
        // Other tests' todos share the database, so only these three's order is checked
        var order = todos!.Select(t => t.Id).Where(id => id == first || id == second || id == third);
        Assert.Equal([second, third, first], order);
    }

    // A retry re-sends the same request, and shouldn't move the todo back to the top of Done
    [Fact]
    public async Task Completing_a_todo_that_is_already_done_keeps_its_place()
    {
        var ct = TestContext.Current.CancellationToken;
        var (first, second) = (Guid.CreateVersion7(), Guid.CreateVersion7());
        foreach (var id in new[] { first, second })
        {
            await _client.PostAsJsonAsync("/api/todos", new { id, title = "Book flights" }, ct);
        }
        await _client.PutAsJsonAsync($"/api/todos/{first}/done", new { done = true }, ct);
        await _client.PutAsJsonAsync($"/api/todos/{second}/done", new { done = true }, ct);

        var response = await _client.PutAsJsonAsync($"/api/todos/{first}/done", new { done = true }, ct);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var todos = await _client.GetFromJsonAsync<List<TodoJson>>("/api/todos", ct);
        var order = todos!.Select(t => t.Id).Where(id => id == first || id == second);
        Assert.Equal([second, first], order);
    }

    // Like a todo deleted from another device while this one still shows it
    [Fact]
    public async Task Completing_a_todo_that_does_not_exist_is_a_404_problem_details()
    {
        var ct = TestContext.Current.CancellationToken;

        var response = await _client.PutAsJsonAsync($"/api/todos/{Guid.CreateVersion7()}/done", new { done = true }, ct);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<ProblemJson>(ct);
        Assert.Equal(new ProblemJson(404, "Not Found", "That todo doesn't exist. It may have been deleted."), problem);
    }

    [Fact]
    public async Task Deleted_todo_no_longer_shows_in_the_list()
    {
        var ct = TestContext.Current.CancellationToken;
        var id = Guid.CreateVersion7();
        await _client.PostAsJsonAsync("/api/todos", new { id, title = "Return the library book" }, ct);

        var response = await _client.DeleteAsync($"/api/todos/{id}", ct);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var todos = await _client.GetFromJsonAsync<List<TodoJson>>("/api/todos", ct);
        Assert.DoesNotContain(todos!, t => t.Id == id);
    }

    // The JSON the UI sees, kept apart from the API's DTO so a breaking change to the contract fails here
    private sealed record TodoJson(Guid Id, string Title, bool Done);
}

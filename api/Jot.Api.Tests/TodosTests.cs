using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

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

    // Undo: the todo comes back as it was, so a done one keeps its place in Done
    [Fact]
    public async Task Restored_todo_comes_back_with_the_same_id_title_and_done_state_in_its_old_place()
    {
        var ct = TestContext.Current.CancellationToken;
        var (first, second) = (Guid.CreateVersion7(), Guid.CreateVersion7());
        foreach (var id in new[] { first, second })
        {
            await _client.PostAsJsonAsync("/api/todos", new { id, title = "Renew passport" }, ct);
        }
        await _client.PutAsJsonAsync($"/api/todos/{first}/done", new { done = true }, ct);
        await _client.PutAsJsonAsync($"/api/todos/{second}/done", new { done = true }, ct);
        await _client.DeleteAsync($"/api/todos/{first}", ct);

        var response = await _client.PostAsync($"/api/todos/{first}/restore", null, ct);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(new TodoJson(first, "Renew passport", Done: true), await response.Content.ReadFromJsonAsync<TodoJson>(ct));

        var todos = await _client.GetFromJsonAsync<List<TodoJson>>("/api/todos", ct);
        Assert.Contains(new TodoJson(first, "Renew passport", Done: true), todos!);
        var order = todos!.Select(t => t.Id).Where(id => id == first || id == second);
        Assert.Equal([second, first], order);
    }

    [Fact]
    public async Task Deleting_a_todo_that_does_not_exist_is_a_404_problem_details()
    {
        var ct = TestContext.Current.CancellationToken;

        var response = await _client.DeleteAsync($"/api/todos/{Guid.CreateVersion7()}", ct);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<ProblemJson>(ct);
        Assert.Equal(new ProblemJson(404, "Not Found", "That todo doesn't exist. It may have been deleted."), problem);
    }

    // A retry re-sends the same request, and shouldn't fail because the first one already worked
    [Fact]
    public async Task Deleting_a_todo_twice_is_a_204_both_times()
    {
        var ct = TestContext.Current.CancellationToken;
        var id = Guid.CreateVersion7();
        await _client.PostAsJsonAsync("/api/todos", new { id, title = "Cancel the gym" }, ct);

        var first = await _client.DeleteAsync($"/api/todos/{id}", ct);
        var second = await _client.DeleteAsync($"/api/todos/{id}", ct);

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, second.StatusCode);
    }

    [Fact]
    public async Task Restoring_a_todo_that_does_not_exist_is_a_404_problem_details()
    {
        var ct = TestContext.Current.CancellationToken;

        var response = await _client.PostAsync($"/api/todos/{Guid.CreateVersion7()}/restore", null, ct);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<ProblemJson>(ct);
        Assert.Equal(new ProblemJson(404, "Not Found", "That todo doesn't exist. It may have been deleted."), problem);
    }

    [Fact]
    public async Task Edited_todo_shows_its_new_title_and_notes_in_the_list()
    {
        var ct = TestContext.Current.CancellationToken;
        var id = Guid.CreateVersion7();
        await _client.PostAsJsonAsync("/api/todos", new { id, title = "Essay" }, ct);

        var response = await _client.PutAsJsonAsync(
            $"/api/todos/{id}", new { title = "History essay", notes = "https://canvas.example/essay" }, ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var edited = new TodoJson(id, "History essay", Done: false, Notes: "https://canvas.example/essay");
        Assert.Equal(edited, await response.Content.ReadFromJsonAsync<TodoJson>(ct));
        var todos = await _client.GetFromJsonAsync<List<TodoJson>>("/api/todos", ct);
        Assert.Contains(edited, todos!);
    }

    [Fact]
    public async Task New_todo_has_no_notes()
    {
        var ct = TestContext.Current.CancellationToken;

        var added = await _client.PostAsJsonAsync("/api/todos", new { title = "Buy stamps" }, ct);

        var json = await added.Content.ReadFromJsonAsync<JsonElement>(ct);
        Assert.Equal(JsonValueKind.Null, json.GetProperty("notes").ValueKind);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  \n ")]
    public async Task Clearing_a_todos_notes_saves_it_with_no_notes(string? notes)
    {
        var ct = TestContext.Current.CancellationToken;
        var id = Guid.CreateVersion7();
        await _client.PostAsJsonAsync("/api/todos", new { id, title = "Lab report" }, ct);
        await _client.PutAsJsonAsync($"/api/todos/{id}", new { title = "Lab report", notes = "Due Friday" }, ct);

        var response = await _client.PutAsJsonAsync($"/api/todos/{id}", new { title = "Lab report", notes }, ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var todos = await _client.GetFromJsonAsync<List<TodoJson>>("/api/todos", ct);
        Assert.Contains(new TodoJson(id, "Lab report", Done: false, Notes: null), todos!);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Editing_a_todo_to_a_blank_title_is_rejected_and_it_keeps_its_old_title(string title)
    {
        var ct = TestContext.Current.CancellationToken;
        var id = Guid.CreateVersion7();
        await _client.PostAsJsonAsync("/api/todos", new { id, title = "Book club" }, ct);

        var response = await _client.PutAsJsonAsync($"/api/todos/{id}", new { title, notes = "Chapter 4" }, ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<ProblemJson>(ct);
        Assert.Equal(new ProblemJson(400, "Bad Request", "A todo needs a title."), problem);
        var todos = await _client.GetFromJsonAsync<List<TodoJson>>("/api/todos", ct);
        Assert.Contains(new TodoJson(id, "Book club", Done: false), todos!);
    }

    // Like a todo deleted from another device while this one had its editor open
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Editing_a_todo_that_does_not_exist_or_was_deleted_is_a_404_problem_details(bool existedOnce)
    {
        var ct = TestContext.Current.CancellationToken;
        var id = Guid.CreateVersion7();
        if (existedOnce)
        {
            await _client.PostAsJsonAsync("/api/todos", new { id, title = "Dentist" }, ct);
            await _client.DeleteAsync($"/api/todos/{id}", ct);
        }

        var response = await _client.PutAsJsonAsync($"/api/todos/{id}", new { title = "Dentist at 3", notes = (string?)null }, ct);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<ProblemJson>(ct);
        Assert.Equal(new ProblemJson(404, "Not Found", "That todo doesn't exist. It may have been deleted."), problem);
    }

    [Fact]
    public async Task Restored_todo_keeps_its_notes()
    {
        var ct = TestContext.Current.CancellationToken;
        var id = Guid.CreateVersion7();
        await _client.PostAsJsonAsync("/api/todos", new { id, title = "Physics problem set" }, ct);
        await _client.PutAsJsonAsync($"/api/todos/{id}", new { title = "Physics problem set", notes = "Questions 1-8" }, ct);
        await _client.DeleteAsync($"/api/todos/{id}", ct);

        await _client.PostAsync($"/api/todos/{id}/restore", null, ct);

        var todos = await _client.GetFromJsonAsync<List<TodoJson>>("/api/todos", ct);
        Assert.Contains(new TodoJson(id, "Physics problem set", Done: false, Notes: "Questions 1-8"), todos!);
    }

    // Like an MCP or Siri caller, which doesn't say which List
    [Fact]
    public async Task Todo_added_without_a_list_goes_in_the_inbox()
    {
        var ct = TestContext.Current.CancellationToken;
        var inboxId = await InboxIdAsync(ct);

        var added = await _client.PostAsJsonAsync("/api/todos", new { title = "Pick up the dry cleaning" }, ct);

        Assert.Equal(HttpStatusCode.Created, added.StatusCode);
        var todo = await added.Content.ReadFromJsonAsync<ListedTodoJson>(ct);
        Assert.Equal(inboxId, todo!.ListId);
        var todos = await _client.GetFromJsonAsync<List<ListedTodoJson>>("/api/todos", ct);
        Assert.Contains(todo, todos!);
    }

    [Fact]
    public async Task Adding_a_todo_to_a_list_that_does_not_exist_is_a_404_problem_details()
    {
        var ct = TestContext.Current.CancellationToken;

        var response = await _client.PostAsJsonAsync(
            "/api/todos", new { title = "Study for the quiz", listId = Guid.CreateVersion7() }, ct);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<ProblemJson>(ct);
        Assert.Equal(new ProblemJson(404, "Not Found", "That list doesn't exist. It may have been deleted."), problem);
    }

    [Fact]
    public async Task A_lists_page_shows_only_its_own_todos()
    {
        var ct = TestContext.Current.CancellationToken;
        var listId = await AddListAsync("School", ct);
        var (inSchool, inInbox) = (Guid.CreateVersion7(), Guid.CreateVersion7());
        await _client.PostAsJsonAsync("/api/todos", new { id = inSchool, title = "Essay draft", listId }, ct);
        await _client.PostAsJsonAsync("/api/todos", new { id = inInbox, title = "Groceries" }, ct);

        var todos = await _client.GetFromJsonAsync<List<ListedTodoJson>>($"/api/todos?listId={listId}", ct);

        Assert.Equal([new ListedTodoJson(inSchool, "Essay draft", Done: false, Notes: null, listId)], todos);
        var inbox = await _client.GetFromJsonAsync<List<ListedTodoJson>>($"/api/todos?listId={await InboxIdAsync(ct)}", ct);
        Assert.Contains(inbox!, t => t.Id == inInbox);
        Assert.DoesNotContain(inbox!, t => t.Id == inSchool);
    }

    [Fact]
    public async Task Todo_moved_to_another_list_shows_under_the_new_list_and_not_the_old()
    {
        var ct = TestContext.Current.CancellationToken;
        var (from, to) = (await AddListAsync("School", ct), await AddListAsync("Work", ct));
        var id = Guid.CreateVersion7();
        await _client.PostAsJsonAsync("/api/todos", new { id, title = "Expense report", listId = from }, ct);

        var response = await _client.PutAsJsonAsync(
            $"/api/todos/{id}", new { title = "Expense report", notes = (string?)null, listId = to }, ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var moved = new ListedTodoJson(id, "Expense report", Done: false, Notes: null, to);
        Assert.Equal(moved, await response.Content.ReadFromJsonAsync<ListedTodoJson>(ct));
        Assert.Equal([moved], await _client.GetFromJsonAsync<List<ListedTodoJson>>($"/api/todos?listId={to}", ct));
        Assert.Empty((await _client.GetFromJsonAsync<List<ListedTodoJson>>($"/api/todos?listId={from}", ct))!);
    }

    [Fact]
    public async Task Moving_a_todo_to_a_list_that_does_not_exist_is_a_404_and_it_stays_where_it_was()
    {
        var ct = TestContext.Current.CancellationToken;
        var listId = await AddListAsync("School", ct);
        var id = Guid.CreateVersion7();
        await _client.PostAsJsonAsync("/api/todos", new { id, title = "Flashcards", listId }, ct);

        var response = await _client.PutAsJsonAsync(
            $"/api/todos/{id}", new { title = "Flashcards", notes = (string?)null, listId = Guid.CreateVersion7() }, ct);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemJson>(ct);
        Assert.Equal(new ProblemJson(404, "Not Found", "That list doesn't exist. It may have been deleted."), problem);
        var todos = await _client.GetFromJsonAsync<List<ListedTodoJson>>($"/api/todos?listId={listId}", ct);
        Assert.Contains(todos!, t => t.Id == id);
    }

    // Undo on a List's page brings the todo back on that page, not in the Inbox
    [Fact]
    public async Task Restored_todo_comes_back_in_its_list()
    {
        var ct = TestContext.Current.CancellationToken;
        var listId = await AddListAsync("Work", ct);
        var id = Guid.CreateVersion7();
        await _client.PostAsJsonAsync("/api/todos", new { id, title = "Quarterly review", listId }, ct);
        await _client.DeleteAsync($"/api/todos/{id}", ct);

        var response = await _client.PostAsync($"/api/todos/{id}/restore", null, ct);

        var restored = new ListedTodoJson(id, "Quarterly review", Done: false, Notes: null, listId);
        Assert.Equal(restored, await response.Content.ReadFromJsonAsync<ListedTodoJson>(ct));
        Assert.Equal([restored], await _client.GetFromJsonAsync<List<ListedTodoJson>>($"/api/todos?listId={listId}", ct));
    }

    // The database is shared by every test, so each list gets a name no other test uses
    private async Task<Guid> AddListAsync(string name, CancellationToken ct)
    {
        var id = Guid.CreateVersion7();
        var added = await _client.PostAsJsonAsync("/api/lists", new { id, name = $"{name} {id}" }, ct);
        Assert.Equal(HttpStatusCode.Created, added.StatusCode);
        return id;
    }

    private async Task<Guid> InboxIdAsync(CancellationToken ct)
    {
        var lists = await _client.GetFromJsonAsync<List<ListJson>>("/api/lists", ct);
        return lists!.Single(l => l.IsInbox).Id;
    }

    // The JSON the UI sees, kept apart from the API's DTO so a breaking change to the contract fails here
    private sealed record TodoJson(Guid Id, string Title, bool Done, string? Notes = null);

    // The same, with the List it's in, for the tests about lists
    private sealed record ListedTodoJson(Guid Id, string Title, bool Done, string? Notes, Guid ListId);

    private sealed record ListJson(Guid Id, string Name, bool IsInbox, int NotDoneCount);
}

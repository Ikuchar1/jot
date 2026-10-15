using System.Net;
using System.Net.Http.Json;

namespace Jot.Api.Tests;

public class ListsTests(JotApiFactory api)
{
    private readonly HttpClient _client = api.CreateClient();

    // The shared database has other tests' todos in its Inbox, so this one gets a database of its own
    [Fact]
    public async Task Fresh_database_has_just_the_inbox_with_nothing_in_it()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var fresh = new JotApiFactory();
        await fresh.InitializeAsync();

        var lists = await fresh.CreateClient().GetFromJsonAsync<List<ListJson>>("/api/lists", ct);

        var inbox = Assert.Single(lists!);
        Assert.Equal("Inbox", inbox.Name);
        Assert.True(inbox.IsInbox);
        Assert.Equal(0, inbox.NotDoneCount);
    }

    [Fact]
    public async Task Added_list_shows_up_with_nothing_in_it()
    {
        var ct = TestContext.Current.CancellationToken;
        var id = Guid.CreateVersion7();
        var name = UniqueName("School");

        var added = await _client.PostAsJsonAsync("/api/lists", new { id, name }, ct);

        Assert.Equal(HttpStatusCode.Created, added.StatusCode);
        var list = new ListJson(id, name, IsInbox: false, NotDoneCount: 0);
        Assert.Equal(list, await added.Content.ReadFromJsonAsync<ListJson>(ct));
        var lists = await _client.GetFromJsonAsync<List<ListJson>>("/api/lists", ct);
        Assert.Contains(list, lists!);
        Assert.True(lists![0].IsInbox, "The Inbox comes first");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task List_with_a_blank_name_is_rejected_with_a_400_problem_details(string name)
    {
        var ct = TestContext.Current.CancellationToken;

        var response = await _client.PostAsJsonAsync("/api/lists", new { name }, ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<ProblemJson>(ct);
        Assert.Equal(new ProblemJson(400, "Bad Request", "A list needs a name."), problem);
    }

    // "work" and "Work" in the sidebar would look like the same List
    [Fact]
    public async Task List_named_like_one_that_exists_is_rejected_whatever_its_case()
    {
        var ct = TestContext.Current.CancellationToken;
        var name = UniqueName("Work");
        await _client.PostAsJsonAsync("/api/lists", new { name }, ct);

        var response = await _client.PostAsJsonAsync("/api/lists", new { name = name.ToUpperInvariant() }, ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemJson>(ct);
        Assert.Equal(
            new ProblemJson(400, "Bad Request", $"There's already a list called {name.ToUpperInvariant()}."), problem);
    }

    [Fact]
    public async Task List_named_inbox_is_rejected()
    {
        var ct = TestContext.Current.CancellationToken;

        var response = await _client.PostAsJsonAsync("/api/lists", new { name = "inbox" }, ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Not_done_count_leaves_out_done_and_deleted_todos_and_follows_adds_completes_and_moves()
    {
        var ct = TestContext.Current.CancellationToken;
        var (school, work) = (await AddListAsync("School", ct), await AddListAsync("Work", ct));
        var (essay, quiz, reading, lab) =
            (Guid.CreateVersion7(), Guid.CreateVersion7(), Guid.CreateVersion7(), Guid.CreateVersion7());
        foreach (var id in new[] { essay, quiz, reading, lab })
        {
            await _client.PostAsJsonAsync("/api/todos", new { id, title = "Homework", listId = school }, ct);
        }
        Assert.Equal(4, await NotDoneCountAsync(school, ct));

        await _client.PutAsJsonAsync($"/api/todos/{essay}/done", new { done = true }, ct);
        Assert.Equal(3, await NotDoneCountAsync(school, ct));

        await _client.DeleteAsync($"/api/todos/{quiz}", ct);
        Assert.Equal(2, await NotDoneCountAsync(school, ct));

        await _client.PutAsJsonAsync($"/api/todos/{reading}", new { title = "Homework", notes = (string?)null, listId = work }, ct);
        Assert.Equal(1, await NotDoneCountAsync(school, ct));
        Assert.Equal(1, await NotDoneCountAsync(work, ct));
    }

    private async Task<int> NotDoneCountAsync(Guid listId, CancellationToken ct)
    {
        var lists = await _client.GetFromJsonAsync<List<ListJson>>("/api/lists", ct);
        return lists!.Single(l => l.Id == listId).NotDoneCount;
    }

    private async Task<Guid> AddListAsync(string name, CancellationToken ct)
    {
        var id = Guid.CreateVersion7();
        var added = await _client.PostAsJsonAsync("/api/lists", new { id, name = UniqueName(name) }, ct);
        Assert.Equal(HttpStatusCode.Created, added.StatusCode);
        return id;
    }

    // The database is shared by every test, so each list gets a name no other test uses
    private static string UniqueName(string name) => $"{name} {Guid.NewGuid():N}"[..20];

    // The JSON the UI sees, kept apart from the API's DTO so a breaking change to the contract fails here
    private sealed record ListJson(Guid Id, string Name, bool IsInbox, int NotDoneCount);
}

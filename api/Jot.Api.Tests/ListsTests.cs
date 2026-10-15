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

    // The JSON the UI sees, kept apart from the API's DTO so a breaking change to the contract fails here
    private sealed record ListJson(Guid Id, string Name, bool IsInbox, int NotDoneCount);
}

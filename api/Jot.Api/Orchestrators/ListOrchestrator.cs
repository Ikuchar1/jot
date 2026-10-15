using Jot.Api.Data;
using Jot.Api.Dtos;
using Jot.Api.Errors;
using Microsoft.EntityFrameworkCore;

namespace Jot.Api.Orchestrators;

public class ListOrchestrator(JotDbContext db)
{
    public async Task<TodoListDto> AddAsync(AddListRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new BrokenRuleException("A list needs a name.");
        }

        var name = request.Name.Trim();
        // Case-insensitive, so "work" and "Work" can't both show in the sidebar
        if (await db.TodoLists.AnyAsync(l => l.Name.ToLower() == name.ToLower(), ct))
        {
            throw new BrokenRuleException($"There's already a list called {name}.");
        }

        var list = new TodoList { Id = request.Id ?? Guid.CreateVersion7(), Name = name };
        db.TodoLists.Add(list);
        await db.SaveChangesAsync(ct);
        return new TodoListDto(list.Id, list.Name, list.IsInbox, NotDoneCount: 0);
    }

    // The Inbox first, then by name. Deleted todos are left out of the count by Todo's query filter.
    public async Task<List<TodoListDto>> ListAsync(CancellationToken ct) =>
        await db.TodoLists
            .OrderByDescending(l => l.IsInbox)
            .ThenBy(l => l.Name)
            .Select(l => new TodoListDto(
                l.Id, l.Name, l.IsInbox, db.Todos.Count(t => t.ListId == l.Id && t.CompletedAt == null)))
            .ToListAsync(ct);
}

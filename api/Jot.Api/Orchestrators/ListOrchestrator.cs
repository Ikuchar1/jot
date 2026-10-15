using Jot.Api.Data;
using Jot.Api.Dtos;
using Microsoft.EntityFrameworkCore;

namespace Jot.Api.Orchestrators;

public class ListOrchestrator(JotDbContext db)
{
    // The Inbox first, then by name. Deleted todos are left out of the count by Todo's query filter.
    public async Task<List<TodoListDto>> ListAsync(CancellationToken ct) =>
        await db.TodoLists
            .OrderByDescending(l => l.IsInbox)
            .ThenBy(l => l.Name)
            .Select(l => new TodoListDto(
                l.Id, l.Name, l.IsInbox, db.Todos.Count(t => t.ListId == l.Id && t.CompletedAt == null)))
            .ToListAsync(ct);
}

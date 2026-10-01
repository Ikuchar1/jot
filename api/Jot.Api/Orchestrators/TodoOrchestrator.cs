using Jot.Api.Data;
using Jot.Api.Dtos;
using Jot.Api.Errors;
using Microsoft.EntityFrameworkCore;

namespace Jot.Api.Orchestrators;

public class TodoOrchestrator(JotDbContext db)
{
    public async Task<TodoDto> AddAsync(AddTodoRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            throw new BrokenRuleException("A todo needs a title.");
        }

        var todo = new Todo { Id = request.Id ?? Guid.CreateVersion7(), Title = request.Title };
        db.Todos.Add(todo);
        await db.SaveChangesAsync(ct);
        return TodoDto.From(todo);
    }

    // UUID v7 IDs are time-ordered, so ordering by ID lists todos oldest first
    public async Task<List<TodoDto>> ListAsync(CancellationToken ct) =>
        await db.Todos.OrderBy(t => t.Id).Select(t => TodoDto.From(t)).ToListAsync(ct);
}

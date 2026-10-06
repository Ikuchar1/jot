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

    public async Task<TodoDto> SetDoneAsync(Guid id, bool done, CancellationToken ct)
    {
        var todo = await db.Todos.FindAsync([id], ct)
            ?? throw new NotFoundException("That todo doesn't exist. It may have been deleted.");
        // Already done keeps its original time, so a retry doesn't move it to the top of Done
        todo.CompletedAt = done ? todo.CompletedAt ?? DateTime.UtcNow : null;
        await db.SaveChangesAsync(ct);
        return TodoDto.From(todo);
    }

    // A soft delete: the row stays, so Undo can bring the todo back with every field it had
    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var todo = await db.Todos.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == id, ct);
        todo!.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    // Not-done todos first, oldest first (UUID v7 IDs are time-ordered); then done ones, most recently done first
    public async Task<List<TodoDto>> ListAsync(CancellationToken ct) =>
        await db.Todos
            .OrderBy(t => t.CompletedAt != null)
            .ThenByDescending(t => t.CompletedAt)
            .ThenBy(t => t.Id)
            .Select(t => TodoDto.From(t))
            .ToListAsync(ct);
}

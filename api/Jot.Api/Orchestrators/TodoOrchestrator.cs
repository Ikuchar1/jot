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

        var todo = new Todo
        {
            Id = request.Id ?? Guid.CreateVersion7(),
            Title = request.Title,
            ListId = await ListIdAsync(request.ListId, ct),
        };
        db.Todos.Add(todo);
        await db.SaveChangesAsync(ct);
        return TodoDto.From(todo);
    }

    // No list means the Inbox; a list that doesn't exist (deleted from another device, say) is a 404
    private async Task<Guid> ListIdAsync(Guid? listId, CancellationToken ct)
    {
        if (listId is null)
        {
            return await db.TodoLists.Where(l => l.IsInbox).Select(l => l.Id).SingleAsync(ct);
        }

        return await db.TodoLists.AnyAsync(l => l.Id == listId, ct)
            ? listId.Value
            : throw new NotFoundException("That list doesn't exist. It may have been deleted.");
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

    public async Task<TodoDto> UpdateAsync(Guid id, UpdateTodoRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            throw new BrokenRuleException("A todo needs a title.");
        }

        // Deleted todos are hidden by the query filter, so editing one is a 404 like a todo that never existed
        var todo = await db.Todos.FindAsync([id], ct)
            ?? throw new NotFoundException("That todo doesn't exist. It may have been deleted.");
        todo.Title = request.Title;
        // Clearing the notes box leaves "" or stray spaces behind; either way the todo has no notes
        todo.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes;
        await db.SaveChangesAsync(ct);
        return TodoDto.From(todo);
    }

    // A soft delete: the row stays, so Undo can bring the todo back with every field it had
    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        // Already-deleted todos are found too, so deleting one again (a retry) still succeeds
        var todo = await db.Todos.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new NotFoundException("That todo doesn't exist. It may have been deleted.");
        todo.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    // Undo for a delete: every field the todo had is still on the row, so it comes back as it was
    public async Task<TodoDto> RestoreAsync(Guid id, CancellationToken ct)
    {
        var todo = await db.Todos.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new NotFoundException("That todo doesn't exist. It may have been deleted.");
        todo.DeletedAt = null;
        await db.SaveChangesAsync(ct);
        return TodoDto.From(todo);
    }

    // Not-done todos first, oldest first (UUID v7 IDs are time-ordered); then done ones, most recently done first.
    // With a listId, only that List's todos.
    public async Task<List<TodoDto>> ListAsync(Guid? listId, CancellationToken ct) =>
        await db.Todos
            .Where(t => listId == null || t.ListId == listId)
            .OrderBy(t => t.CompletedAt != null)
            .ThenByDescending(t => t.CompletedAt)
            .ThenBy(t => t.Id)
            .Select(t => TodoDto.From(t))
            .ToListAsync(ct);
}

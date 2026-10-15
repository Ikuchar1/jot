namespace Jot.Api.Data;

public class Todo
{
    public Guid Id { get; set; }
    public required string Title { get; set; }

    // Optional free text, like a link to the assignment; null when there are none
    public string? Notes { get; set; }

    // Filled in by Postgres when the row is inserted (see JotDbContext)
    public DateTime CreatedAt { get; set; }

    // When it was checked off; null while it isn't done
    public DateTime? CompletedAt { get; set; }

    // When it was deleted; null while it isn't. Kept so Undo can bring it back as it was (see JotDbContext)
    public DateTime? DeletedAt { get; set; }
}

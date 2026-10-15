namespace Jot.Api.Data;

// A List. Named TodoList so it doesn't collide with C#'s List<T>; everything people read says "List".
public class TodoList
{
    // The Inbox row the migration seeds. Code finds the Inbox by IsInbox, not by this ID; it's fixed only so the
    // seed and the default for todos.list_id (which put todos from before lists existed in the Inbox) agree.
    public static readonly Guid InboxId = new("0199e1c0-0000-7000-8000-000000000001");

    public Guid Id { get; set; }
    public required string Name { get; set; }

    // True only for the Inbox: where a todo added without a list goes. A partial unique index keeps it to one.
    public bool IsInbox { get; set; }

    // Filled in by Postgres when the row is inserted (see JotDbContext)
    public DateTime CreatedAt { get; set; }
}

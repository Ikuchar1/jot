using Microsoft.EntityFrameworkCore;

namespace Jot.Api.Data;

public class JotDbContext(DbContextOptions<JotDbContext> options) : DbContext(options)
{
    public DbSet<Todo> Todos => Set<Todo>();
    public DbSet<TodoList> TodoLists => Set<TodoList>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TodoList>().Property(l => l.CreatedAt).HasDefaultValueSql("now()");

        // Only ever one Inbox. Once sign-ups come, this becomes unique on (user_id) WHERE is_inbox: one per user.
        modelBuilder.Entity<TodoList>().HasIndex(l => l.IsInbox).IsUnique().HasFilter("is_inbox");

        // The Inbox exists from the first run
        modelBuilder.Entity<TodoList>().HasData(new TodoList
        {
            Id = TodoList.InboxId,
            Name = "Inbox",
            IsInbox = true,
            CreatedAt = new DateTime(2026, 10, 14, 0, 0, 0, DateTimeKind.Utc),
        });

        // Every todo is in exactly one List. The default puts todos from before lists existed in the Inbox when the
        // column is added; the orchestrator always sets the list itself.
        modelBuilder.Entity<Todo>().HasOne<TodoList>().WithMany().HasForeignKey(t => t.ListId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Todo>().Property(t => t.ListId).HasDefaultValue(TodoList.InboxId);

        // Postgres stamps each new todo, so nothing that adds one has to remember to
        modelBuilder.Entity<Todo>().Property(t => t.CreatedAt).HasDefaultValueSql("now()");

        // Deleted todos are hidden from every query; only restoring one looks past this, with IgnoreQueryFilters()
        modelBuilder.Entity<Todo>().HasQueryFilter(t => t.DeletedAt == null);
    }
}

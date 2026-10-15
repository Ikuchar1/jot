namespace Jot.Api.Dtos;

// A List as the sidebar shows it. NotDoneCount leaves out done and deleted todos.
public record TodoListDto(Guid Id, string Name, bool IsInbox, int NotDoneCount);

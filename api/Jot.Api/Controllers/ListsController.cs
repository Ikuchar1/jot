using Jot.Api.Dtos;
using Jot.Api.Orchestrators;
using Microsoft.AspNetCore.Mvc;

namespace Jot.Api.Controllers;

[ApiController]
[Route("api/lists")]
public class ListsController(ListOrchestrator lists) : ControllerBase
{
    // The sidebar: every List with its count of not-done todos
    [HttpGet(Name = "ListLists")]
    public Task<List<TodoListDto>> ListLists(CancellationToken ct) => lists.ListAsync(ct);
}

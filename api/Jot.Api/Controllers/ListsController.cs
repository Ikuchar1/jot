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

    [HttpPost(Name = "AddList")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
    public async Task<ActionResult<TodoListDto>> AddList(AddListRequest request, CancellationToken ct)
    {
        var list = await lists.AddAsync(request, ct);
        // No get-one-list endpoint yet, so there's no URL for a Location header
        return Created((string?)null, list);
    }
}

using Jot.Api.Data;
using Jot.Api.Errors;
using Jot.Api.Orchestrators;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi(options => options.AddDocumentTransformer((document, _, _) =>
{
    document.Info.Title = "Jot API";
    return Task.CompletedTask;
}));

builder.Services.AddDbContext<JotDbContext>(options => options
    .UseNpgsql(builder.Configuration.GetConnectionString("Jot"))
    .UseSnakeCaseNamingConvention());

builder.Services.AddScoped<TodoOrchestrator>();

// Every error comes back as ProblemDetails: a broken rule is a 400, and any other exception a 500 that hides its details
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<BrokenRuleHandler>();

// The UI calls the API on its own port (no Vite proxy), so the browser needs CORS to allow its origin
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
{
    if (builder.Environment.IsDevelopment())
    {
        // Each worktree runs its UI on its own port (see dev.sh), so allow any localhost port
        policy.SetIsOriginAllowed(origin => Uri.TryCreate(origin, UriKind.Absolute, out var uri) && uri.IsLoopback);
    }
    else
    {
        policy.WithOrigins(allowedOrigins);
    }

    policy.AllowAnyHeader().AllowAnyMethod();
}));

var app = builder.Build();

// First, so it catches exceptions from everything after it. Without it, Development shows the stack trace.
app.UseExceptionHandler();
app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    // Browsable API reference with "try it out" at /scalar
    app.MapScalarApiReference();
}

app.MapControllers();

app.Run();

namespace Api.Services;

public interface ICurrentUser
{
    string? Sub { get; }
    string? Username { get; }
    bool IsInRole(string role);
}

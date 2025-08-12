namespace Api.Authorization;

public static class Roles
{
    public const string Admin = "admin";
    public const string User  = "user";
}

public static class Policies
{
    public const string CanRead  = "read";
    public const string CanWrite = "write";
    public const string Admin    = "admin";
}

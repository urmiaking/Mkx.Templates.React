namespace Mkx.Templates.Contracts.Authorization;
public static class AppPolicies
{

    public static class Users
    {
        public const string View = "Mkx.Templates-Users-View";
        public const string Manage = "Mkx.Templates-Users-Manage";
        public const string ManageClaims = "Mkx.Templates-Users-ManageClaims";
    }
    public static class SampleItems
    {
        public const string View = "Mkx.Templates-SampleItems-View";
        public const string Manage = "Mkx.Templates-SampleItems-Manage";
    }
    public static readonly IReadOnlyList<string> All = [Users.View, Users.Manage, Users.ManageClaims, SampleItems.View, SampleItems.Manage];
    public static bool IsKnown(string permission) => All.Contains(permission, StringComparer.Ordinal);
}

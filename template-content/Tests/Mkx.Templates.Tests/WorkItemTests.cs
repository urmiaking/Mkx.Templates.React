using Mkx.Templates.Domain;
using Xunit;

namespace Mkx.Templates.Tests;

public class WorkItemTests
{
    [Fact]
    public void Create_TrimsTitle_AndSetsVersion()
    {
        var item = WorkItem.Create("  Build feature  ");
        Assert.Equal("Build feature", item.Title);
        Assert.Equal(1, item.Version);
        item.Edit("Done", true);
        Assert.True(item.IsComplete);
        Assert.Equal(2, item.Version);
    }

    [Theory]
    [InlineData("")]
    [InlineData("  ")]
    public void Create_RejectsBlankTitle(string title) =>
        Assert.Throws<ArgumentException>(() => WorkItem.Create(title));
}

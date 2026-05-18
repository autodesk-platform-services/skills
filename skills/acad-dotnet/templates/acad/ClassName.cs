using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.ApplicationServices.Core;
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Geometry;
using Autodesk.AutoCAD.Runtime;
using System.IO;

[assembly: CommandClass(typeof($RootNamespace$.$ClassName$))]
[assembly: ExtensionApplication(typeof($RootNamespace$.CommandsRegistrar))]

namespace $RootNamespace$  // This will be replaced by the user's chosen
                           // namespace
{
/// <summary>
/// This class is used to register the commands in the AutoCAD environment.
/// </summary>
public class CommandsRegistrar : IExtensionApplication
{
    /// <summary>
    /// Initializes the application.
    /// </summary>
    public void Initialize()
    {
        // Register your business logic specific here if needed
        // List all commands
        Editor ed = Application.DocumentManager.MdiActiveDocument.Editor;
        ed.WriteMessage("\n$ClassName$ plugin loaded successfully!");
    }

    /// <summary>
    /// Cleans up resources when the application is terminated.
    /// </summary>
    public void Terminate()
    {
        // Cleanup code if necessary
    }
}
    /// <summary>
    /// Contains example AutoCAD commands.
    /// </summary>
public class $ClassName$ {
    /// <summary>
    /// This command is an example of how to create a simple command in AutoCAD.
    /// It can be executed from the command line in AutoCAD.
    /// </summary>
    /// <remarks>
    /// The command name is "SayHello" and it can be invoked by typing "ACADCMD
    /// SayHello" in the AutoCAD command line.
    /// </remarks>
    /// <summary>
    /// A simple command that writes a message to the AutoCAD command line.
    /// </summary>
    [CommandMethod("ACADCMD", "SayHello", CommandFlags.Modal)]
    public void SayHello()
    {
        Editor ed = Application.DocumentManager.MdiActiveDocument.Editor;
        ed.WriteMessage("\nHello from your new AutoCAD Plugin!");
        // save the the hello message to a file
        string currentFolder = Directory.GetCurrentDirectory();
        string outputPath = Path.Combine(currentFolder, "result.txt");
        File.WriteAllText(outputPath, "Hello from your new AutoCAD Plugin!");
    }
}

}
// This file is part of the AutoCAD .NET Plugin template.
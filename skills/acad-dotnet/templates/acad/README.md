# 📝 AutoCAD .NET Add-in: $RootNamespace$

This project, `$RootNamespace$`, is an AutoCAD Add-in generated using the AutoCAD .NET template. It provides a custom command, **`$CommandName$`**, within the **`$CommandGroup$`** group, designed for AutoCAD version **AcadVersion**.

---

## 🛠️ Build Instructions

Follow these steps to build the AutoCAD Add-in:

1. **Restore and Build**: Open your terminal or command prompt and navigate to the project's root directory. Then, execute the following commands:

   ```bash
   dotnet restore
   dotnet build -c Release
   ```

2. **Locate Output**: Upon successful build, the compiled output, including the add-in bundle, will be available in the following directory:
   
   ```
   bin\Release\net8.0-windows\
   ```
   
   Specifically, your AutoCAD Add-in bundle will be packaged as: `$RootNamespace$.bundle.zip`

---

## 🧪 Local Testing with `accoreconsole.exe`

Before deploying to Design Automation, you can validate your plugin locally using `accoreconsole.exe`, a command-line version of AutoCAD.

1. **Prepare a Test Drawing**: Create a simple AutoCAD drawing file named `test.dwg` using AutoCAD. This will be the input for your test.

2. **Create a Test Script**: Create a text file named `test.scr` in the same directory as your `test.dwg` with the following content:
   
   ```
   $CommandName$ 
   ```
   
   This script will execute your add-in's command and then save the drawing.

3. **Run the Test**: Execute the following command in your terminal. Replace `"C:\Program Files\Autodesk\AutoCAD 2025\accoreconsole.exe"` with the actual path to your `accoreconsole.exe` if it differs.
   
3. **Run the Test**: Execute the following command in your terminal. Replace `"C:\Program Files\Autodesk\AutoCAD 2025\accoreconsole.exe"` with the actual path to your `accoreconsole.exe` if it differs.

   ```
   "C:\Program Files\Autodesk\AutoCAD 2025\accoreconsole.exe" ^
    /i "test.dwg" ^
    /al "$RootNamespace$.bundle" ^
    /s "test.scr"
   ```
   - You can also inspect the `test.log` file (automatically generated in the same directory) for detailed output and any potential issues.

---

## 🚀 Deploying to Autodesk Platform Services (APS) Design Automation

Once you've validated your add-in locally, you can deploy it to APS Design Automation for cloud-based processing.

1. **Upload AppBundle**: Upload the `$RootNamespace$.bundle.zip` file. You can do this via your preferred method, such as your Custom MCP server or the APS CLI (Command Line Interface).

2. **Register AppBundle**: Register the uploaded bundle as an AppBundle within your APS application.

3. **Create Activity and WorkItem**: Link your registered AppBundle with an Activity, and then run a WorkItem that utilizes this Activity to execute your add-in in the cloud.
   - **💡 Tip**: The required zip file for deployment is already generated for you as `$RootNamespace$.bundle.zip` during the build process.

---

## 🔗 Resources

For more detailed information and advanced usage, refer to the following resources:

- **APS Design Automation Documentation**: [APIs | Autodesk Platform Services](https://aps.autodesk.com/en/docs/design-automation)

- **`accoreconsole.exe` Scripting**: [Unit Testing AutoCAD with NUnit + AcCoreConsole - AutoCAD DevBlog](https://adndevblog.typepad.com/autocad/2025/06/unit-testing-autocad-with-nunit-accoreconsole.html)

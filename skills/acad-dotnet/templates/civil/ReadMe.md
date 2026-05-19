# Civil Class Library Template

This project is a template for creating a Civil 3D class library. It includes a sample command that adds COGO points to a selected Civil 3D parcel.

## Project Structure

```bash
.template.config/
    template.json
CivilClassLib.csproj
Cmd.cs
```



### Files

- **.template.config/template.json**: Configuration file for the template.
- **CivilClassLib.csproj**: Project file for the class library.
- **Cmd.cs**: Contains the sample command implementation.

## Getting Started

### Prerequisites

- Visual Studio 2022 or later
- .NET 8.0 SDK
- AutoCAD 2025 with Civil 3D

### Cloning the Repository

To clone the repository, run the following command:

```bash
git clone https://github.com/MadhukarMoogala/CivilClassLibTemplate.git
cd CivilClassLibTemplate

```

### Installing the Template

To install the template, navigate to the cloned directory and run:

```bash
cd Civil
dotnet new install .
```

![image](https://github.com/user-attachments/assets/1db22bcb-1d01-48bd-b7df-588105a2e49b)


### Creating a New Project from the Template

To create a new project using the installed template, run:

```bash
dotnet new civil --rootNamespace=ProjectName -o ProjectName
```
![image](https://github.com/user-attachments/assets/138331f6-c1e4-4cc7-ba73-27c75abd5ebc)


### Building the Project

1. Open the solution in Visual Studio.
2. Restore the NuGet packages.
3. Build the project.
   
![image](https://github.com/user-attachments/assets/9edce182-e656-4f30-aa48-bb2de5f9cfe7)


### Running the Command

1. Load the compiled DLL into AutoCAD.
2. Run the AddPointsToParcel command.

### Customizing the Template

You can customize the template by modifying the template.json file in the .template.config folder. The `rootNamespace` symbol can be replaced with your desired namespace.

## References

- AutoCAD .NET API Documentation
- Civil 3D .NET API Documentation

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Madhukar Moogala

---

This template helps you quickly set up a Civil 3D class library with a sample command. Customize it to fit your needs and extend it with additional functionality as required.

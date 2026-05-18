using System;
using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Geometry;
using Autodesk.AutoCAD.Runtime;
using Autodesk.Civil.ApplicationServices;
using Autodesk.Civil.DatabaseServices;

/// <summary>
/// A command that adds COGO points to a selected Civil 3D parcel.
/// </summary>
namespace $RootNamespace$
{
    public class ParcelPointAdder : Civil3DCommandBase
{
    [CommandMethod("C3DCMD", "AddPointsToParcel", CommandFlags.Modal)]
    public void AddPointsToParcel()
    {
        try
        {
            using (Transaction tr = StartTransaction())
            {
                ObjectId parcelId = PromptForEntity("\nSelect a parcel:", typeof(Parcel));
                if (parcelId == ObjectId.Null)
                {
                    Ed.WriteMessage("\nNo valid parcel selected.");
                    return;
                }

                Point3dCollection pts = new Point3dCollection();
                if (!CollectParcelPoints(tr, parcelId, pts))
                {
                    Ed.WriteMessage("\nFailed to collect points from the parcel.");
                    return;
                }

                if (!AddCogoPoints(tr, pts))
                {
                    Ed.WriteMessage("\nFailed to add COGO points.");
                    return;
                }

                tr.Commit();
                Ed.WriteMessage("\nSuccessfully added points to the parcel.");
            }
        }
        catch (System.Exception ex)
        {
            Ed.WriteMessage($"\nError: {ex.Message}");
        }
    }

    private bool CollectParcelPoints(Transaction tr, ObjectId parcelId, Point3dCollection pts)
    {
        try
        {
            Parcel parcel = tr.GetObject(parcelId, OpenMode.ForRead) as Parcel;
            if (parcel?.BaseCurve is Polyline polyline)
            {
                for (int i = 0; i < polyline.NumberOfVertices; i++)
                {
                    Point3d pt = polyline.GetPoint3dAt(i);
                    if (!pts.Contains(pt))
                        pts.Add(pt);
                }
                return true;
            }
            else
            {
                Ed.WriteMessage("\nParcel boundary is not a polyline.");
            }
        }
        catch (System.Exception ex)
        {
            Ed.WriteMessage($"\nError collecting parcel points: {ex.Message}");
        }
        return false;
    }

    private bool AddCogoPoints(Transaction tr, Point3dCollection pts)
    {
        try
        {
            if (pts.Count > 0)
            {
                CivilDoc.CogoPoints.Add(pts, "PARCEL_PT", true);
                return UpdatePointGroup(tr, "Parcel Pts", "PARCEL*");
            }
            else
            {
                Ed.WriteMessage("\nNo points found to add.");
            }
        }
        catch (System.Exception ex)
        {
            Ed.WriteMessage($"\nError adding COGO points: {ex.Message}");
        }
        return false;
    }

    private bool UpdatePointGroup(Transaction tr, string groupName, string descriptionFilter)
    {
        try
        {
            ObjectId groupId = CivilDoc.PointGroups.Contains(groupName)
                ? CivilDoc.PointGroups[groupName]
                : CivilDoc.PointGroups.Add(groupName);

            PointGroup pointGroup = tr.GetObject(groupId, OpenMode.ForWrite) as PointGroup;
            if (pointGroup != null)
            {
                pointGroup.SetQuery(new StandardPointGroupQuery
                {
                    IncludeRawDescriptions = descriptionFilter
                });
                pointGroup.Update();
                return true;
            }
            else
            {
                Ed.WriteMessage("\nFailed to get or create the point group.");
            }
        }
        catch (System.Exception ex)
        {
            Ed.WriteMessage($"\nError updating point group: {ex.Message}");
        }
        return false;
    }
}

public abstract class Civil3DCommandBase
{
    protected static Document AcadDoc => Application.DocumentManager.MdiActiveDocument;
    protected static Editor Ed => AcadDoc.Editor;
    protected static CivilDocument CivilDoc => CivilApplication.ActiveDocument;

    protected static Transaction StartTransaction() =>
        AcadDoc.Database.TransactionManager.StartTransaction();

    protected static ObjectId PromptForEntity(string message, Type entityType)
    {
        try
        {
            PromptEntityOptions opts = new PromptEntityOptions(message);
            opts.SetRejectMessage($"\nSelected entity is not a {entityType.Name}");
            opts.AddAllowedClass(entityType, false);

            PromptEntityResult result = Ed.GetEntity(opts);
            return result.Status == PromptStatus.OK ? result.ObjectId : ObjectId.Null;
        }
        catch (System.Exception ex)
        {
            Ed.WriteMessage($"\nError in entity selection: {ex.Message}");
        }
        return ObjectId.Null;
    }
}
}

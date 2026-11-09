// ES5-style extension and panel (P20).
function MyExtension(viewer, options) {
    Autodesk.Viewing.Extension.call(this, viewer, options);
}
MyExtension.prototype = Object.create(Autodesk.Viewing.Extension.prototype);

function MyPanel(viewer, container, id, title) {
    Autodesk.Viewing.UI.DockingPanel.call(this, container, id, title);
}
MyPanel.prototype.initialize = function () {
    Autodesk.Viewing.UI.DockingPanel.prototype.initialize.call(this);
};

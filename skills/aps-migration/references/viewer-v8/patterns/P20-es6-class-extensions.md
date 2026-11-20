# P20. Custom extensions and viewer subclasses must be ES6 classes

In v8, custom extensions must be ES6 classes that extend `Autodesk.Viewing.Extension`;
`Autodesk.Viewing.Extension.call(this, viewer, options)` isn't supported. The same applies to
subclasses of `Viewer3D`, `GuiViewer3D`, `Document`, `FileLoader`, `Profile`, `Navigation`,
`ViewingUtilities`, and `Snapper`. ES5 constructors that call `Parent.call(this, ...)` aren't supported on v8.

`ToolInterface` and the `Autodesk.Viewing.UI` classes (`DockingPanel`, `Button`, `ToolBar`, …) are
ES6 classes too. The changelog says ES5-style subclasses of them keep working, but port them in
the same pass so the code base uses one style.

```js
// v7 (ES5)
function MyExtension(viewer, options) {
    Autodesk.Viewing.Extension.call(this, viewer, options);
}
MyExtension.prototype = Object.create(Autodesk.Viewing.Extension.prototype);
MyExtension.prototype.constructor = MyExtension;
MyExtension.prototype.load = function () { return true; };
MyExtension.prototype.unload = function () { return true; };

// v8
class MyExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
    }
    load() { return true; }
    unload() { return true; }
}

Autodesk.Viewing.theExtensionManager.registerExtension('MyExtension', MyExtension);
```

Rules:

- Move prototype methods into the class body. Keep `this` bindings for event handlers explicit
  (`this.onSelection = this.onSelection.bind(this)` in the constructor, or arrow-function fields).
- `Object.create(Parent.prototype)`, `Parent.prototype.method.call(this, ...)`, and
  `Parent.call(this, ...)` become `extends`, `super.method(...)`, and `super(...)`.
- Panels: `function MyPanel(...) { Autodesk.Viewing.UI.DockingPanel.call(this, ...) }` becomes
  `class MyPanel extends Autodesk.Viewing.UI.DockingPanel`. Call `super(...)` before touching
  `this`.
- Transpiled code: make sure the build doesn't down-level classes to ES5 functions (for example,
  Babel `preset-env` targeting old browsers, or TypeScript `target: "ES5"`). Target ES2015 or later.
- Both forms run on v7, so port extensions to classes while you're still on v7.

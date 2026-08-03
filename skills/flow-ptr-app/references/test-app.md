# Test an app

- Iterate using Toolkit's **Reload and Restart** menu item to pick up code and config changes
  without restarting the host application (see [Implement a Flow PTR app](implement-app.md) for
  what enables it and its limits).
- Ask whether to verify headless in `tk-shell` first before testing in the final DCC/engine, or go
  straight to the final target — `tk-shell` first gives a faster logic-only loop (no DCC startup)
  and catches non-UI bugs early, but ultimately the dialog/UI still needs to be confirmed working
  in the real target engine (`tk-desktop` or the DCC itself) before calling it tested.
- To bring in another tester without giving them production access, add them to the
  **User Restrictions** field on the sandbox's `PipelineConfiguration` entity in PTR, and make sure
  they have read access to your app's repo/checkout.
- The Python API is useful for writing quick test scripts or exercising app logic against real
  PTR data outside the DCC:
  - https://developers.shotgridsoftware.com/python-api/
  - https://help.autodesk.com/view/SGDEV/ENU/?guid=SGD_py_python_api_overview_html

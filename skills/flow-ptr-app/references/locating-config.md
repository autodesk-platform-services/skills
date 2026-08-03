# Locating a project configuration

Find the `PipelineConfiguration` you'll actually be developing against, and figure out how it's
set up. This determines where files live, whether there's a local `tank` command to run, and
where the app's code should be cloned.

Check the project's **Pipeline Configurations** page in Flow Production Tracking, or query it via
the API:

```python
sg.find_one(
    "PipelineConfiguration",
    [["project", "is", {"type": "Project", "id": PROJECT_ID}], ["code", "is", "Primary"]],
    ["mac_path", "windows_path", "linux_path", "descriptor"],
)
```

**Planning boundary:** this query (and reading the descriptor scheme below) is read-only and safe
to run during a plan pass — it doesn't touch the filesystem or any repo. Almost everything else in
this guide branches on what it returns (sandbox strategy, install method, and whether this lookup
itself ends in "blocked, escalate" for some descriptor types), so best practice is to run this
lookup first and draft the rest of the plan *after* it returns, rather than planning the whole
thing upfront. Everything from here on — cloning, write-access probes, `tank` commands — is
execution, not planning.

- **Populated `mac_path`/`windows_path`/`linux_path`, no `descriptor`** → **centralized (classic)**
  configuration.
- **Populated `descriptor`, empty path fields** → **distributed** configuration.

**Centralized (classic):** the whole config lives at one fixed path shared by every machine. Read
[centralized-config.md](centralized-config.md) before continuing — it covers the access checks you
must run before touching that path, plus how sandboxing, cloning, and the final release descriptor
differ for this config type.

**Distributed:** there's no single fixed install location — every machine resolves the `descriptor`
on demand into its own local bundle cache. Read [distributed-config.md](distributed-config.md)
before continuing — read the whole file, not just the descriptor-type table: some descriptor types
(App Store, FPTR-attachment) carry escalation steps that are easy to miss if skipped.

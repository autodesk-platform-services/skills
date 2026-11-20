# IDs and URNs

Read this when a call returns 404 or 400 and the ID might be the wrong kind, in the wrong format, or not
encoded the way that API expects.

## The ID kinds

| Kind | Looks like | Used by |
| --- | --- | --- |
| OSS object ID | `urn:adsk.objects:os.object:{bucketKey}/{objectKey}` | Object Storage, and as the source for translation |
| Hub ID | `b.<guid>` (ACC and BIM 360), other forms for Fusion | Data Management |
| Project ID | `b.<guid>` in Data Management, plain `<guid>` in Admin, Issues, and most Forma APIs | See below |
| Folder ID | `urn:adsk.wipprod:fs.folder:co.<id>` | Data Management |
| Item (lineage) ID | `urn:adsk.wipprod:dm.lineage:<id>` | Data Management, the stable identity of a file across versions |
| Version ID | `urn:adsk.wipprod:fs.file:vf.<id>?version=<n>` | Data Management, one specific version; the `?version=` part is part of the ID |
| Model Derivative URN | Base64 of an OSS object ID or version ID | Model Derivative, Viewer |
| AEC Data Model IDs | Opaque strings | AEC Data Model GraphQL |

The `b.` prefix is a Data Management convention for ACC and BIM 360 hubs and projects. Most Forma APIs take the
same GUID without the prefix. A 404 on a project that exists usually means the prefix is wrong for that API.

## Encoding a Model Derivative URN

Model Derivative paths take the source design's identifier as **URL-safe Base64**: standard Base64 with `+`
replaced by `-`, `/` by `_`, and the trailing `=` padding removed.

```js
const toUrn = id => Buffer.from(id).toString('base64url');   // Node 16+: base64url has no padding
const fromUrn = urn => Buffer.from(urn, 'base64url').toString();
```

```python
import base64
to_urn = lambda s: base64.urlsafe_b64encode(s.encode()).decode().rstrip('=')
```

```csharp
string ToUrn(string id) => Convert.ToBase64String(Encoding.UTF8.GetBytes(id))
    .TrimEnd('=').Replace('+', '-').Replace('/', '_');
```

Rules:

- Encode the **version ID including `?version=n`** when translating a file from a hub. Encoding the item ID
  translates nothing useful.
- Don't encode again if you already have a URN from a manifest or a translation response.
- The `derivativeUrn` in `.../manifest/{derivativeUrn}/...` paths is a different thing: URL-encode it (percent
  encoding), don't Base64 it.
- Decode a URN to debug: if the decoded text isn't an `urn:adsk...` string, the wrong value was encoded.

## Object keys

Bucket keys must be unique within a region, and can't be renamed after creation. Object keys can contain
characters that must be percent-encoded in a path (spaces, `#`, `?`, `/`). Encode the key when you build the URL
and use the same key, unencoded, when you build the OSS object ID for the URN.

## Mapping between ID worlds

- DM project to Admin project: remove `b.`.
- AEC Data Model project to DM project: read `alternativeIdentifiers.externalProjectId`.
- Version to file: a version belongs to an item. To get the latest version of a file, read the item's
  `tip` version, or list its versions.
- Hub to region: read the hub's `attributes.region` from the Data Management hubs response. See `regions.md`.

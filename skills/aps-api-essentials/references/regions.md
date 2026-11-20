# Regions

Read this when data "disappears", a list comes back empty, a hook can't be found, or a translation seems slow.
Regional behavior is the most common silent cause.

## Concepts

- An Autodesk region is a country or area where Autodesk stores and processes a customer's data. The data for
  a hub in one region isn't the same data, in the same place, as another region's.
- **The data decides the region, not your app or token.** Establish the region of the hub, project, or folder
  first. Don't infer it from the user's location or the app.
- Region codes follow ISO 3166 alpha-3, except `US` and `EMEA`: `US`, `EMEA`, `AUS`, `CAN`, `DEU`, `IND`, `JPN`,
  `GBR`. Australia is `AUS`. The old `APAC` code was retired in favor of `AUS`; migrate any code that still
  sends it. Which products offer which regions varies, so check the product docs.
- Default when nothing is specified is `US`.

## How each API takes the region

| API | How to name the region |
| --- | --- |
| Data Management, Object Storage | A bucket's region is set when it's created (see the Create Bucket reference). For hubs, read each hub's region from the hubs response |
| Model Derivative, create job | `region` request header. The body field `output.destination.region` is deprecated: remove it |
| Model Derivative, manifest, metadata, properties, tree, downloads | `region` header, same value as the job |
| Webhooks | `region` header, `x-ads-region` header, or `region` query parameter, in that order of precedence. One base URL for all regions |
| AEC Data Model | One endpoint for all regions: `POST https://developer.api.autodesk.com/aec/graphql`. Region goes in a header. See the GraphQL endpoint page |
| Forma (ACC) APIs | Mostly automatic routing through the US endpoint. A few older admin endpoints have an EMEA-specific URI |
| Viewer | Newer regions need a recent Viewer version and the `DS_ENDPOINTS` feature flag set before `Initializer`. Check the current Viewer docs |

Rules that apply across APIs:

- The region header wins over a region in the request body.
- A region-specific URI (for example the EMEA one) makes the header get ignored.
- Conflicting values can return an error (for example 406 Not Acceptable).

## Keep storage and translation in one region

Don't move data to the US just to translate it. Translate in the region where the source lives, read the
manifest and derivatives from the same region, and consume them from there. A flow that stores in EMEA but
translates in the US adds a cross-region transfer, latency, and a dependency on two regions.

When reviewing an older integration, trace one file through the whole workflow and write down: where the
source lives, which region the translation request names, and where the derivative is read. All three should
match.

## Webhooks are regional objects

A webhook is created, stored, and delivered within one region. List, update, and delete hooks in the region
where they were created, or they won't appear. To find every hook for an app, query each region you use.

## Diagnosing "not found" and empty results

1. Read the hub's region from the Data Management hubs response.
2. Repeat the failing request with that region on the right header or parameter.
3. For hooks, repeat the list in every region the app uses.
4. For translations, compare the job's region with the region used on the read call.

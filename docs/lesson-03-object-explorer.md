# Lesson 03 — Org Intelligence: Object Explorer

This guide records the first release. For the current four-tab interface,
field inspector, child relationships and record types, see
[Lesson 03B](lesson-03b-object-explorer.md).

## What this adds

Open **OrgArchitect AI → Explore Org**. Search objects by label or API name,
filter standard/custom objects, select an object, and inspect readable fields.
Search fields by label, API name, data type, or relationship target. Toggle
**Show relationship fields only** to inspect lookup/reference relationships.
Lists display 50 entries per page. **Back to dashboard** returns home.

## Components

```text
orgArchHome → orgArchObjectExplorer
                   ↓
       OrgArchObjectExplorerController
                   ↓
           OrgArchSchemaService
                   ↓
          Salesforce Schema Describe
```

The controller exposes cacheable read methods. The service performs discovery
and checks object and field read access explicitly. Top-level DTO classes
`OrgArchObjectSummary`, `OrgArchObjectDetail`, and `OrgArchFieldDetail` provide
the typed LWC response contract. The Admin and Viewer permission sets grant
controller access; they do not grant additional access to customer objects.

The feature runs no business-record queries or DML and does not require AI
credits or callouts. Unknown and inaccessible object requests receive the same
error. Relationship targets are included only when the user can explore them.

## Scope

This version supports readable, queryable objects, including custom/namespaced
objects. It displays field names, labels, data types, custom/calculated flags,
and accessible relationship targets. It does not yet distinguish master-detail
from lookup, discover child relationships, or inspect validation rules, Flows,
triggers, record types, or object descriptions. Those require further work.

Object and field filtering/pagination is client-side. The initial discovery
returns all eligible object summaries; very large org performance should be
measured before introducing a scan cache or server-side search.

## Development verification

```powershell
npm install
npm run test:unit -- -- --runInBand
npm run lint

sf project deploy start --source-dir force-app/main/default/classes --source-dir force-app/main/default/lwc/orgArchHome --source-dir force-app/main/default/lwc/orgArchObjectExplorer --source-dir force-app/main/default/permissionsets --target-org OrgArchScratch --test-level RunSpecifiedTests --tests OrgArchSchemaServiceTest --wait 10
```

The Apex tests cover Account schema and relationships, invalid input, read-only
execution, restricted-user object access, and field-level security. The LWC
tests cover dashboard navigation, search/filtering, paging, retry/error states,
and overlapping requests completing out of order.

## Manual acceptance

1. Open the existing OrgArchitect AI application in `OrgArchScratch`.
2. Click **Explore Org**, search for Account, and select it.
3. Verify Name and ParentId; filter relationships and verify ParentId → Account.
4. Search for a nonexistent object/field and verify the empty state.
5. If a custom object exists, select it and verify its custom classification,
   field details, and namespace-qualified API names.
6. Return to the dashboard and reopen the explorer.
7. With a restricted user who has the OrgArchitect Viewer permission set,
   verify that the displayed schema follows that user's object and field access.

The Developer Edition org contains the previously installed managed beta.
Scratch-org source deployment does not update that installed package. Build a
new beta containing this feature and install it separately when ready for the
next package installation check.

## Salesforce references

- [Expose Apex methods to LWC](https://developer.salesforce.com/docs/platform/lwc/guide/apex-expose-method.html)
- [Describe object schema](https://developer.salesforce.com/docs/platform/api/guide/sforce-api-calls-describesobjects-describesobjectresult.html)

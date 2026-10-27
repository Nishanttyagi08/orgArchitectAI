# Lesson 03B — Enhanced Object Explorer

Open **OrgArchitect AI → Explore Org**, search for an object, and select it.
The selected object now has four tabs.

## Overview

Summary cards show readable fields, parent reference fields, and available record
types. The overview lists the object API name, plural label, standard/custom
classification, key prefix, and the current user's create/update/delete access.
These are informational permissions; this feature does not change records.

## Fields

Select a field label to open its inspector. The inspector displays the API name,
data type, length, precision, scale, nullability, custom/calculated/auto-number
flags, create/update access, help text, and applicable relationship details.

Zero precision or scale is displayed as zero. Nullability is distinct from a
field being required on a page layout or during record creation. Formula
expressions, field descriptions and picklist value restrictions are outside
this increment.

## Relationships

This tab discovers relationships when first opened for the selected object.

- **Parent:** a readable reference field on the selected object pointing to an
  accessible, queryable target.
- **Child:** a readable foreign-key field on an accessible, queryable object
  pointing back to the selected object.

Search by related object, reference field, relationship name, or relationship
type. Filter parent/child directions and browse 50 rows per page. A self-reference
can appear in both directions. Polymorphic fields can produce multiple parent
rows, so a parent row count can differ from the summary's reference-field count.

Classification uses Schema Describe: polymorphic reference, master-detail when
a relationship order is exposed, or lookup/reference. Some relationships have
no SOQL child relationship name; the table preserves that missing name rather
than inventing one.

## Record Types

Only active record types available to the current user are returned. The table
shows labels, developer names, IDs, the Master flag, and the user's default
mapping. Master is Salesforce's system record type. This tab does not list
record-type-specific picklist values or page layout assignments.

## Implementation

- `OrgArchObjectDetail` now carries overview capabilities and record types.
- `OrgArchFieldDetail` now carries help text, field capabilities and relationship
  classification.
- `OrgArchRecordTypeDetail` and `OrgArchRelationshipDetail` are top-level DTOs.
- `OrgArchObjectExplorerController.getObjectRelationships` is a separate,
  cacheable read endpoint. Both endpoint paths reject inaccessible objects.
- Child discovery checks both the related object's access and its foreign-key
  field's access. Switching objects invalidates previous detail/relationship
  requests and resets tabs, filters, paging and field inspection.
- Deferred object describes avoid eagerly loading unrelated schema information.

No new object permissions, customer data objects, callouts or business-record
queries were introduced. The existing controller permission grants cover the
new endpoint.

## Verification and walkthrough

```powershell
npm ci
npm run test:unit -- -- --runInBand
npm run lint
```

1. Select Account; verify the overview and available record types.
2. Open Fields, select Name, and inspect length/nullability/access flags.
3. Open Relationships; verify Account.ParentId under Parent and
   Contact.AccountId under Child, when accessible to your user.
4. Search/filter relationships, then switch objects while a request is loading.
   Verify that old relationship rows and field details do not remain.
5. Inspect Task.WhoId for a polymorphic reference, if that field is accessible.
6. Repeat with a custom object, master-detail relationship and additional record
   types when those are present in your org.

The scratch-org source deployment updates development functionality. A separate
managed beta build/install is required to update the Developer org's installed
package.

## Salesforce references

- [DescribeFieldResult](https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_methods_system_fields_describe.htm)
- [ChildRelationship](https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_class_Schema_ChildRelationship.htm)
- [RecordTypeInfo](https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_class_Schema_RecordTypeInfo.htm)

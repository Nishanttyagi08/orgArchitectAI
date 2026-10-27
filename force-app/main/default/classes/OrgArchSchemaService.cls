/** Read-only schema discovery. Sharing alone does not enforce object/field access. */
public with sharing class OrgArchSchemaService {
  public class DiscoveryException extends Exception {
  }

  public static List<OrgArchObjectSummary> getObjects() {
    Map<String, Schema.SObjectType> objectTypes = Schema.getGlobalDescribe();
    List<String> names = new List<String>(objectTypes.keySet());
    names.sort();
    List<OrgArchObjectSummary> results = new List<OrgArchObjectSummary>();
    for (String name : names) {
      Schema.DescribeSObjectResult description = objectTypes.get(name)
        .getDescribe(SObjectDescribeOptions.DEFERRED);
      if (!canExplore(description)) {
        continue;
      }
      OrgArchObjectSummary summary = new OrgArchObjectSummary();
      summary.apiName = description.getName();
      summary.label = description.getLabel();
      summary.isCustom = description.isCustom();
      results.add(summary);
    }
    return results;
  }

  public static OrgArchObjectDetail getObjectDetails(String objectApiName) {
    Schema.DescribeSObjectResult description = requireObject(objectApiName);
    OrgArchObjectDetail result = new OrgArchObjectDetail();
    result.apiName = description.getName();
    result.label = description.getLabel();
    result.pluralLabel = description.getLabelPlural();
    result.isCustom = description.isCustom();
    result.keyPrefix = description.getKeyPrefix();
    result.isCreateable = description.isCreateable();
    result.isUpdateable = description.isUpdateable();
    result.isDeletable = description.isDeletable();
    result.recordTypes = new List<OrgArchRecordTypeDetail>();
    for (Schema.RecordTypeInfo recordType : description.getRecordTypeInfos()) {
      if (recordType.isActive() && recordType.isAvailable()) {
        OrgArchRecordTypeDetail detail = new OrgArchRecordTypeDetail();
        detail.recordTypeId = recordType.getRecordTypeId();
        detail.label = recordType.getName();
        detail.developerName = recordType.getDeveloperName();
        detail.isMaster = recordType.isMaster();
        detail.isDefault = recordType.isDefaultRecordTypeMapping();
        result.recordTypes.add(detail);
      }
    }
    result.fields = new List<OrgArchFieldDetail>();
    Map<String, Schema.SObjectField> objectFields = description.fields.getMap();
    List<String> fieldNames = new List<String>(objectFields.keySet());
    fieldNames.sort();
    for (String fieldName : fieldNames) {
      Schema.DescribeFieldResult field = objectFields.get(fieldName)
        .getDescribe();
      if (!field.isAccessible() || field.isDeprecatedAndHidden()) {
        continue;
      }
      OrgArchFieldDetail detail = new OrgArchFieldDetail();
      detail.apiName = field.getName();
      detail.label = field.getLabel();
      detail.dataType = String.valueOf(field.getType());
      detail.isCustom = field.isCustom();
      detail.isCalculated = field.isCalculated();
      detail.isNullable = field.isNillable();
      detail.isCreateable = field.isCreateable();
      detail.isUpdateable = field.isUpdateable();
      detail.isAutoNumber = field.isAutoNumber();
      detail.inlineHelpText = field.getInlineHelpText();
      detail.relationshipType = relationshipType(field);
      detail.length = field.getLength();
      detail.precision = field.getPrecision();
      detail.scale = field.getScale();
      detail.relationshipName = field.getRelationshipName();
      detail.referenceTo = new List<String>();
      for (Schema.SObjectType target : field.getReferenceTo()) {
        Schema.DescribeSObjectResult targetDescription = target.getDescribe(
          SObjectDescribeOptions.DEFERRED
        );
        if (canExplore(targetDescription)) {
          detail.referenceTo.add(targetDescription.getName());
        }
      }
      detail.referenceTo.sort();
      result.fields.add(detail);
    }
    return result;
  }

  /** Kept separate so child schema discovery runs only when requested. */
  public static List<OrgArchRelationshipDetail> getObjectRelationships(
    String objectApiName
  ) {
    Schema.DescribeSObjectResult description = requireObject(objectApiName);
    List<OrgArchRelationshipDetail> results = new List<OrgArchRelationshipDetail>();
    for (
      Schema.SObjectField fieldToken : description.fields.getMap().values()
    ) {
      Schema.DescribeFieldResult field = fieldToken.getDescribe();
      if (!field.isAccessible() || field.isDeprecatedAndHidden()) {
        continue;
      }
      for (Schema.SObjectType target : field.getReferenceTo()) {
        Schema.DescribeSObjectResult targetDescription = target.getDescribe(
          SObjectDescribeOptions.DEFERRED
        );
        if (canExplore(targetDescription)) {
          results.add(
            describeRelationship(
              'Parent',
              targetDescription,
              field,
              field.getRelationshipName()
            )
          );
        }
      }
    }
    for (Schema.ChildRelationship child : description.getChildRelationships()) {
      Schema.SObjectField fieldToken = child.getField();
      if (fieldToken == null || child.isDeprecatedAndHidden()) {
        continue;
      }
      Schema.DescribeSObjectResult childDescription = child.getChildSObject()
        .getDescribe(SObjectDescribeOptions.DEFERRED);
      if (!canExplore(childDescription)) {
        continue;
      }
      Schema.DescribeFieldResult field = fieldToken.getDescribe();
      if (field.isAccessible() && !field.isDeprecatedAndHidden()) {
        results.add(
          describeRelationship(
            'Child',
            childDescription,
            field,
            child.getRelationshipName()
          )
        );
      }
    }
    Map<String, OrgArchRelationshipDetail> uniqueRelationships = new Map<String, OrgArchRelationshipDetail>();
    for (OrgArchRelationshipDetail relationship : results) {
      uniqueRelationships.put(relationship.rowKey, relationship);
    }
    return uniqueRelationships.values();
  }

  private static OrgArchRelationshipDetail describeRelationship(
    String direction,
    Schema.DescribeSObjectResult relatedObject,
    Schema.DescribeFieldResult field,
    String relationshipName
  ) {
    OrgArchRelationshipDetail detail = new OrgArchRelationshipDetail();
    detail.rowKey =
      direction +
      ':' +
      relatedObject.getName() +
      ':' +
      field.getName();
    detail.direction = direction;
    detail.objectApiName = relatedObject.getName();
    detail.objectLabel = relatedObject.getLabel();
    detail.fieldApiName = field.getName();
    detail.fieldLabel = field.getLabel();
    detail.relationshipName = relationshipName;
    detail.relationshipType = relationshipType(field);
    return detail;
  }

  private static String relationshipType(Schema.DescribeFieldResult field) {
    if (field.getType() != Schema.DisplayType.REFERENCE) {
      return null;
    }
    if (field.getReferenceTo().size() > 1) {
      return 'Polymorphic reference';
    }
    return field.getRelationshipOrder() == null
      ? 'Lookup / reference'
      : 'Master-detail';
  }

  private static Schema.DescribeSObjectResult requireObject(
    String objectApiName
  ) {
    if (String.isBlank(objectApiName)) {
      throw new DiscoveryException('Select an object to explore.');
    }
    Schema.SObjectType objectType = Schema.getGlobalDescribe()
      .get(objectApiName.trim());
    // Unknown and inaccessible objects have the same response.
    if (objectType != null) {
      Schema.DescribeSObjectResult description = objectType.getDescribe(
        SObjectDescribeOptions.DEFERRED
      );
      if (canExplore(description)) {
        return description;
      }
    }
    throw new DiscoveryException(
      'This object is unavailable or you do not have read access.'
    );
  }

  private static Boolean canExplore(Schema.DescribeSObjectResult description) {
    return description.isAccessible() &&
      description.isQueryable() &&
      !description.isDeprecatedAndHidden();
  }
}

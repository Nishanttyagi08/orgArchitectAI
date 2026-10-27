public with sharing class OrgArchObjectExplorerController {
  @AuraEnabled(cacheable=true)
  public static List<OrgArchObjectSummary> getObjects() {
    return OrgArchSchemaService.getObjects();
  }

  @AuraEnabled(cacheable=true)
  public static OrgArchObjectDetail getObjectDetails(String objectApiName) {
    try {
      return OrgArchSchemaService.getObjectDetails(objectApiName);
    } catch (OrgArchSchemaService.DiscoveryException discoveryError) {
      AuraHandledException handled = new AuraHandledException(
        discoveryError.getMessage()
      );
      handled.setMessage(discoveryError.getMessage());
      throw handled;
    }
  }

  @AuraEnabled(cacheable=true)
  public static List<OrgArchRelationshipDetail> getObjectRelationships(
    String objectApiName
  ) {
    try {
      return OrgArchSchemaService.getObjectRelationships(objectApiName);
    } catch (OrgArchSchemaService.DiscoveryException discoveryError) {
      AuraHandledException handled = new AuraHandledException(
        discoveryError.getMessage()
      );
      handled.setMessage(discoveryError.getMessage());
      throw handled;
    }
  }
}

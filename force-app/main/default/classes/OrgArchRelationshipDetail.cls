public class OrgArchRelationshipDetail {
  @AuraEnabled
  public String rowKey { get; set; }
  @AuraEnabled
  public String direction { get; set; }
  @AuraEnabled
  public String objectApiName { get; set; }
  @AuraEnabled
  public String objectLabel { get; set; }
  @AuraEnabled
  public String fieldApiName { get; set; }
  @AuraEnabled
  public String fieldLabel { get; set; }
  @AuraEnabled
  public String relationshipName { get; set; }
  @AuraEnabled
  public String relationshipType { get; set; }
}

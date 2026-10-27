public class OrgArchFieldDetail {
  @AuraEnabled
  public String apiName { get; set; }
  @AuraEnabled
  public String label { get; set; }
  @AuraEnabled
  public String dataType { get; set; }
  @AuraEnabled
  public Boolean isCustom { get; set; }
  @AuraEnabled
  public Boolean isCalculated { get; set; }
  @AuraEnabled
  public Boolean isNullable { get; set; }
  @AuraEnabled
  public Boolean isCreateable { get; set; }
  @AuraEnabled
  public Boolean isUpdateable { get; set; }
  @AuraEnabled
  public Boolean isAutoNumber { get; set; }
  @AuraEnabled
  public String inlineHelpText { get; set; }
  @AuraEnabled
  public String relationshipType { get; set; }
  @AuraEnabled
  public Integer length { get; set; }
  @AuraEnabled
  public Integer precision { get; set; }
  @AuraEnabled
  public Integer scale { get; set; }
  @AuraEnabled
  public String relationshipName { get; set; }
  @AuraEnabled
  public List<String> referenceTo { get; set; }
}

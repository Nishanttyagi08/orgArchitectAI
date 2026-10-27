public class OrgArchRecordTypeDetail {
  @AuraEnabled
  public String recordTypeId { get; set; }
  @AuraEnabled
  public String label { get; set; }
  @AuraEnabled
  public String developerName { get; set; }
  @AuraEnabled
  public Boolean isMaster { get; set; }
  @AuraEnabled
  public Boolean isDefault { get; set; }
}

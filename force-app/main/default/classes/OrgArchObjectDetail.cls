public class OrgArchObjectDetail {
  @AuraEnabled
  public String apiName { get; set; }
  @AuraEnabled
  public String label { get; set; }
  @AuraEnabled
  public String pluralLabel { get; set; }
  @AuraEnabled
  public Boolean isCustom { get; set; }
  @AuraEnabled
  public String keyPrefix { get; set; }
  @AuraEnabled
  public Boolean isCreateable { get; set; }
  @AuraEnabled
  public Boolean isUpdateable { get; set; }
  @AuraEnabled
  public Boolean isDeletable { get; set; }
  @AuraEnabled
  public List<OrgArchRecordTypeDetail> recordTypes { get; set; }
  @AuraEnabled
  public List<OrgArchFieldDetail> fields { get; set; }
}

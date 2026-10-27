@IsTest
private class OrgArchSchemaServiceTest {
  @IsTest
  static void listsReadableObjectsWithoutReadingRecords() {
    Test.startTest();
    List<OrgArchObjectSummary> objects = OrgArchObjectExplorerController.getObjects();
    Assert.isTrue(!objects.isEmpty(), 'Discover accessible objects.');
    Assert.areEqual(
      0,
      Limits.getQueries(),
      'Discovery must not query business records.'
    );
    Assert.areEqual(0, Limits.getDmlStatements(), 'Discovery is read-only.');
    Test.stopTest();
    Boolean foundAccount = false;
    Set<String> names = new Set<String>();
    for (OrgArchObjectSummary summary : objects) {
      Assert.isTrue(names.add(summary.apiName), 'Object names must be unique.');
      Schema.DescribeSObjectResult description = Schema.getGlobalDescribe()
        .get(summary.apiName)
        .getDescribe();
      Assert.isTrue(description.isAccessible() && description.isQueryable());
      Assert.isFalse(description.isDeprecatedAndHidden());
      Assert.areEqual(description.getLabel(), summary.label);
      Assert.areEqual(description.isCustom(), summary.isCustom);
      foundAccount = foundAccount || summary.apiName == 'Account';
    }
    Assert.isTrue(
      foundAccount,
      'Account should be available to the test administrator.'
    );
  }

  @IsTest
  static void describesFieldsAndRelationships() {
    Test.startTest();
    OrgArchObjectDetail detail = OrgArchObjectExplorerController.getObjectDetails(
      ' Account '
    );
    Assert.areEqual(0, Limits.getQueries());
    Assert.areEqual(0, Limits.getDmlStatements());
    Test.stopTest();
    Assert.areEqual('Account', detail.apiName);
    Assert.isFalse(detail.isCustom);
    Map<String, OrgArchFieldDetail> fields = new Map<String, OrgArchFieldDetail>();
    for (OrgArchFieldDetail field : detail.fields) {
      Schema.DescribeFieldResult description = Account.SObjectType.getDescribe()
        .fields.getMap()
        .get(field.apiName)
        .getDescribe();
      Assert.isTrue(description.isAccessible());
      Assert.areEqual(description.getLabel(), field.label);
      Assert.isNotNull(field.referenceTo);
      fields.put(field.apiName, field);
    }
    Assert.isTrue(fields.containsKey('Name'));
    Assert.isTrue(fields.containsKey('ParentId'));
    Assert.areEqual('reference', fields.get('ParentId').dataType.toLowerCase());
    Assert.isTrue(fields.get('ParentId').referenceTo.contains('Account'));
    Assert.areEqual('Parent', fields.get('ParentId').relationshipName);
    Assert.areEqual(0, fields.get('Name').referenceTo.size());
    Assert.areEqual(
      Account.Name.getDescribe().getLength(),
      fields.get('Name').length
    );
    Assert.areEqual(
      Account.Name.getDescribe().isNillable(),
      fields.get('Name').isNullable
    );
    Assert.areEqual(
      Account.Name.getDescribe().isCreateable(),
      fields.get('Name').isCreateable
    );
    Assert.areEqual(
      Account.Name.getDescribe().getInlineHelpText(),
      fields.get('Name').inlineHelpText
    );
    Assert.areEqual(
      Account.SObjectType.getDescribe().getKeyPrefix(),
      detail.keyPrefix
    );
    Assert.areEqual(
      Account.SObjectType.getDescribe().isUpdateable(),
      detail.isUpdateable
    );
    // Verify the same top-level response contract consumed by LWC.
    Map<String, Object> serialized = (Map<String, Object>) JSON.deserializeUntyped(
      JSON.serialize(detail)
    );
    Assert.areEqual('Account', serialized.get('apiName'));
    Assert.isNotNull(serialized.get('fields'));
  }

  @IsTest
  static void describesOnlyActiveAvailableRecordTypes() {
    OrgArchObjectDetail detail = OrgArchObjectExplorerController.getObjectDetails(
      'Account'
    );
    Set<String> returnedIds = new Set<String>();
    for (OrgArchRecordTypeDetail recordType : detail.recordTypes) {
      returnedIds.add(recordType.recordTypeId);
      Schema.RecordTypeInfo expected = Account.SObjectType.getDescribe()
        .getRecordTypeInfosById()
        .get(recordType.recordTypeId);
      Assert.isTrue(expected.isActive() && expected.isAvailable());
      Assert.areEqual(expected.getName(), recordType.label);
      Assert.areEqual(expected.getDeveloperName(), recordType.developerName);
      Assert.areEqual(expected.isMaster(), recordType.isMaster);
      Assert.areEqual(
        expected.isDefaultRecordTypeMapping(),
        recordType.isDefault
      );
    }
    for (
      Schema.RecordTypeInfo recordType : Account.SObjectType.getDescribe()
        .getRecordTypeInfos()
    ) {
      Assert.areEqual(
        recordType.isActive() && recordType.isAvailable(),
        returnedIds.contains(recordType.getRecordTypeId())
      );
    }
  }

  @IsTest
  static void discoversParentAndChildRelationshipsWithoutReadingRecords() {
    Test.startTest();
    List<OrgArchRelationshipDetail> relationships = OrgArchObjectExplorerController.getObjectRelationships(
      ' Account '
    );
    Assert.areEqual(0, Limits.getQueries());
    Assert.areEqual(0, Limits.getDmlStatements());
    Test.stopTest();
    Boolean foundParent = false;
    Boolean foundChild = false;
    Set<String> keys = new Set<String>();
    for (OrgArchRelationshipDetail relationship : relationships) {
      Assert.isTrue(
        keys.add(relationship.rowKey),
        'Rows must have unique keys.'
      );
      Schema.DescribeSObjectResult relatedObject = Schema.getGlobalDescribe()
        .get(relationship.objectApiName)
        .getDescribe();
      Assert.isTrue(
        relatedObject.isAccessible() && relatedObject.isQueryable()
      );
      String fieldObject = relationship.direction == 'Parent'
        ? 'Account'
        : relationship.objectApiName;
      Schema.DescribeFieldResult field = Schema.getGlobalDescribe()
        .get(fieldObject)
        .getDescribe()
        .fields.getMap()
        .get(relationship.fieldApiName)
        .getDescribe();
      Assert.isTrue(field.isAccessible());
      Assert.isNotNull(relationship.relationshipType);
      if (
        relationship.direction == 'Parent' &&
        relationship.fieldApiName == 'ParentId' &&
        relationship.objectApiName == 'Account'
      ) {
        foundParent = true;
        Assert.areEqual('Parent', relationship.relationshipName);
      }
      if (
        relationship.direction == 'Child' &&
        relationship.fieldApiName == 'AccountId' &&
        relationship.objectApiName == 'Contact'
      ) {
        foundChild = true;
        Assert.areEqual('Contacts', relationship.relationshipName);
      }
    }
    Assert.isTrue(
      foundParent,
      'Discover Account.ParentId as a parent reference.'
    );
    Assert.isTrue(
      foundChild,
      'Discover Contact.AccountId as a child relationship.'
    );
  }

  @IsTest
  static void identifiesPolymorphicReferences() {
    OrgArchObjectDetail detail = OrgArchObjectExplorerController.getObjectDetails(
      'Task'
    );
    Boolean foundWho = false;
    for (OrgArchFieldDetail field : detail.fields) {
      if (field.apiName == 'WhoId') {
        foundWho = true;
        Assert.areEqual('Polymorphic reference', field.relationshipType);
        Assert.isTrue(field.referenceTo.contains('Contact'));
        Assert.isTrue(field.referenceTo.contains('Lead'));
      }
    }
    Assert.isTrue(foundWho);
  }

  @IsTest
  static void rejectsMissingAndUnknownObjects() {
    for (
      String name : new List<String>{
        null,
        '',
        '   ',
        'NotAnObject__c',
        'Account WHERE Id != null'
      }
    ) {
      try {
        OrgArchObjectExplorerController.getObjectDetails(name);
        Assert.fail('Invalid API names must be rejected.');
      } catch (AuraHandledException discoveryError) {
        Assert.isTrue(
          discoveryError.getMessage().contains('Select an object') ||
          discoveryError.getMessage().contains('unavailable')
        );
      }
      try {
        OrgArchObjectExplorerController.getObjectRelationships(name);
        Assert.fail('Relationship discovery must reject invalid names.');
      } catch (AuraHandledException discoveryError) {
        Assert.isTrue(
          discoveryError.getMessage().contains('Select an object') ||
          discoveryError.getMessage().contains('unavailable')
        );
      }
    }
  }

  @IsTest
  static void excludesFieldsWithoutReadAccess() {
    Profile restrictedProfile = [
      SELECT Id
      FROM Profile
      WHERE Name = 'Minimum Access - Salesforce'
      LIMIT 1
    ];
    User reader = new User(
      Alias = 'oafield',
      Email = 'orgarch-field@example.com',
      EmailEncodingKey = 'UTF-8',
      LastName = 'OrgArchitect Field Reader',
      LanguageLocaleKey = 'en_US',
      LocaleSidKey = 'en_US',
      ProfileId = restrictedProfile.Id,
      TimeZoneSidKey = 'Asia/Kolkata',
      Username = 'orgarch-field-' +
        UserInfo.getOrganizationId() +
        '-' +
        DateTime.now().getTime() +
        '@example.com'
    );
    insert reader;
    PermissionSet readableAccount = new PermissionSet(
      Name = 'OrgArchTestAccountReader',
      Label = 'OrgArch Test Account Reader'
    );
    insert readableAccount;
    insert new ObjectPermissions(
      ParentId = readableAccount.Id,
      SobjectType = 'Account',
      PermissionsRead = true
    );
    insert new FieldPermissions(
      ParentId = readableAccount.Id,
      SobjectType = 'Account',
      Field = 'Account.Industry',
      PermissionsRead = true
    );
    insert new ObjectPermissions(
      ParentId = readableAccount.Id,
      SobjectType = 'Contact',
      PermissionsRead = true
    );
    insert new PermissionSetAssignment(
      AssigneeId = reader.Id,
      PermissionSetId = readableAccount.Id
    );
    System.runAs(reader) {
      Assert.isTrue(Account.SObjectType.getDescribe().isAccessible());
      Assert.isFalse(
        Account.Phone.getDescribe().isAccessible(),
        'Exercise a genuinely hidden field.'
      );
      Assert.isFalse(Account.ParentId.getDescribe().isAccessible());
      Assert.isTrue(Contact.SObjectType.getDescribe().isAccessible());
      Assert.isFalse(Contact.AccountId.getDescribe().isAccessible());
      Test.startTest();
      OrgArchObjectDetail detail = OrgArchObjectExplorerController.getObjectDetails(
        'Account'
      );
      List<OrgArchRelationshipDetail> relationships = OrgArchObjectExplorerController.getObjectRelationships(
        'Account'
      );
      Test.stopTest();
      Set<String> fieldNames = new Set<String>();
      for (OrgArchFieldDetail field : detail.fields) {
        fieldNames.add(field.apiName);
      }
      Assert.isTrue(
        fieldNames.contains('Industry'),
        'Explicitly granted field must be included.'
      );
      Assert.isFalse(
        fieldNames.contains('Phone'),
        'Field without read permission must be excluded.'
      );
      for (OrgArchRelationshipDetail relationship : relationships) {
        Assert.isFalse(
          relationship.direction == 'Parent' &&
            relationship.fieldApiName == 'ParentId',
          'Do not expose an unreadable parent reference.'
        );
        Assert.isFalse(
          relationship.direction == 'Child' &&
            relationship.objectApiName == 'Contact' &&
            relationship.fieldApiName == 'AccountId',
          'Do not expose an unreadable child foreign key.'
        );
      }
    }
  }

  @IsTest
  static void respectsRestrictedUserObjectAndFieldAccess() {
    Profile restrictedProfile = [
      SELECT Id
      FROM Profile
      WHERE Name = 'Minimum Access - Salesforce'
      LIMIT 1
    ];
    User restrictedUser = new User(
      Alias = 'oaread',
      Email = 'orgarch-reader@example.com',
      EmailEncodingKey = 'UTF-8',
      LastName = 'OrgArchitect Reader',
      LanguageLocaleKey = 'en_US',
      LocaleSidKey = 'en_US',
      ProfileId = restrictedProfile.Id,
      TimeZoneSidKey = 'Asia/Kolkata',
      Username = 'orgarch-reader-' +
        UserInfo.getOrganizationId() +
        '-' +
        DateTime.now().getTime() +
        '@example.com'
    );
    insert restrictedUser;
    System.runAs(restrictedUser) {
      Test.startTest();
      List<OrgArchObjectSummary> objects = OrgArchSchemaService.getObjects();
      Set<String> returnedNames = new Set<String>();
      for (OrgArchObjectSummary summary : objects) {
        returnedNames.add(summary.apiName);
      }
      Boolean checkedDeniedObject = false;
      for (
        Schema.SObjectType objectType : Schema.getGlobalDescribe().values()
      ) {
        Schema.DescribeSObjectResult description = objectType.getDescribe();
        if (!description.isAccessible()) {
          checkedDeniedObject = true;
          Assert.isFalse(returnedNames.contains(description.getName()));
          try {
            OrgArchObjectExplorerController.getObjectDetails(
              description.getName()
            );
            Assert.fail('An inaccessible object must not be described.');
          } catch (AuraHandledException discoveryError) {
            Assert.isTrue(discoveryError.getMessage().contains('unavailable'));
          }
          try {
            OrgArchObjectExplorerController.getObjectRelationships(
              description.getName()
            );
            Assert.fail(
              'Relationships of an inaccessible object must be rejected.'
            );
          } catch (AuraHandledException discoveryError) {
            Assert.isTrue(discoveryError.getMessage().contains('unavailable'));
          }
          break;
        }
      }
      Assert.isTrue(checkedDeniedObject, 'Exercise an actual denied object.');
      Test.stopTest();
    }
  }
}

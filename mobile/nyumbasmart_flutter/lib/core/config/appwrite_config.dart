class AppwriteConfig {
  const AppwriteConfig({
    required this.endpoint,
    required this.projectId,
    required this.databaseId,
    required this.listingsCollectionId,
    required this.usersCollectionId,
    required this.listingImagesBucketId,
    required this.selfSigned,
  });

  factory AppwriteConfig.fromEnvironment() {
    return const AppwriteConfig(
      endpoint: String.fromEnvironment(
        'APPWRITE_ENDPOINT',
        defaultValue: 'https://<REGION>.cloud.appwrite.io/v1',
      ),
      projectId: String.fromEnvironment(
        'APPWRITE_PROJECT_ID',
        defaultValue: '<APPWRITE_PROJECT_ID>',
      ),
      databaseId: String.fromEnvironment(
        'APPWRITE_DATABASE_ID',
        defaultValue: '<APPWRITE_DATABASE_ID>',
      ),
      listingsCollectionId: String.fromEnvironment(
        'APPWRITE_COLLECTION_LISTINGS_ID',
        defaultValue: 'listings',
      ),
      usersCollectionId: String.fromEnvironment(
        'APPWRITE_COLLECTION_USERS_ID',
        defaultValue: 'users',
      ),
      listingImagesBucketId: String.fromEnvironment(
        'APPWRITE_BUCKET_LISTING_IMAGES_ID',
        defaultValue: 'listingImages',
      ),
      selfSigned: bool.fromEnvironment('APPWRITE_SELF_SIGNED', defaultValue: false),
    );
  }

  final String endpoint;
  final String projectId;
  final String databaseId;
  final String listingsCollectionId;
  final String usersCollectionId;
  final String listingImagesBucketId;
  final bool selfSigned;
}

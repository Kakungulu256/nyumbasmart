import 'package:appwrite/appwrite.dart';

import '../config/appwrite_config.dart';

class AppwriteServices {
  AppwriteServices(AppwriteConfig config) {
    client = Client()
      ..setEndpoint(config.endpoint)
      ..setProject(config.projectId)
      ..setSelfSigned(status: config.selfSigned);

    account = Account(client);
    databases = Databases(client);
    storage = Storage(client);
  }

  late final Client client;
  late final Account account;
  late final Databases databases;
  late final Storage storage;
}

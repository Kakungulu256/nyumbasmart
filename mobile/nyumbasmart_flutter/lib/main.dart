import 'package:flutter/material.dart';

import 'app/app.dart';
import 'core/config/appwrite_config.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  final config = AppwriteConfig.fromEnvironment();
  runApp(NyumbaSmartApp(config: config));
}

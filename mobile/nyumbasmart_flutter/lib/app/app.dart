import 'package:flutter/material.dart';

import '../core/appwrite/appwrite_services.dart';
import '../core/config/appwrite_config.dart';
import '../features/auth/data/auth_repository.dart';
import '../features/listings/data/listings_repository.dart';
import '../features/listings/presentation/listings_controller.dart';
import '../features/listings/presentation/listings_page.dart';

class NyumbaSmartApp extends StatefulWidget {
  const NyumbaSmartApp({required this.config, super.key});

  final AppwriteConfig config;

  @override
  State<NyumbaSmartApp> createState() => _NyumbaSmartAppState();
}

class _NyumbaSmartAppState extends State<NyumbaSmartApp> {
  late final AppwriteServices _appwriteServices;
  late final ListingsRepository _listingsRepository;
  late final AuthRepository _authRepository;
  late final ListingsController _listingsController;

  @override
  void initState() {
    super.initState();
    _appwriteServices = AppwriteServices(widget.config);
    _listingsRepository = ListingsRepository(
      databases: _appwriteServices.databases,
      config: widget.config,
    );
    _authRepository = AuthRepository(account: _appwriteServices.account);
    _listingsController = ListingsController(repository: _listingsRepository);
    _listingsController.load();
  }

  @override
  void dispose() {
    _listingsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NyumbaSmart Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1D4ED8)),
        useMaterial3: true,
      ),
      home: ListingsPage(
        authRepository: _authRepository,
        controller: _listingsController,
      ),
    );
  }
}

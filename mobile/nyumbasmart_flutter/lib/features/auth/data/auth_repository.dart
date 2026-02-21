import 'package:appwrite/appwrite.dart';
import 'package:appwrite/models.dart' as models;

class AuthRepository {
  const AuthRepository({required this.account});

  final Account account;

  Future<models.User?> getCurrentUser() async {
    try {
      return await account.get();
    } on AppwriteException {
      return null;
    }
  }

  Future<void> loginWithEmailPassword({
    required String email,
    required String password,
  }) async {
    await account.createEmailPasswordSession(
      email: email.trim(),
      password: password,
    );
  }

  Future<void> logoutCurrentSession() async {
    await account.deleteSession(sessionId: 'current');
  }
}

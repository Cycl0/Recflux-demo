import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'user_model.dart';

class AuthService with ChangeNotifier {
  // Initialize Google Sign-In only if we have a client ID
  GoogleSignIn? _googleSignIn;

  String? _userEmail;
  String? _userName;
  String? _userPhotoUrl;
  bool _isSignedIn = false;

  String? get userEmail => _userEmail;
  String? get userName => _userName;
  String? get userPhotoUrl => _userPhotoUrl;
  bool get isSignedIn => _isSignedIn;

  // Add a user getter that returns a simple user object
  UserModel? get user {
    if (!_isSignedIn || _userEmail == null) return null;
    return UserModel(
      email: _userEmail!,
      name: _userName,
      photoUrl: _userPhotoUrl,
    );
  }

  // Get test user email from environment variables or use a default that should exist in the database
  String get testEmail => 'test@example.com';

  AuthService() {
    _initGoogleSignIn();
    _loadUserData();
  }

  void _initGoogleSignIn() {
    final clientId = dotenv.env['NEXT_PUBLIC_GOOGLE_CLIENT_ID'];
    if (clientId != null && clientId.isNotEmpty && kIsWeb) {
      _googleSignIn = GoogleSignIn(
        scopes: ['email', 'profile'],
        clientId: clientId,
      );
      print('Initialized Google Sign-In for web with clientId');
      print(
        'Make sure to add http://localhost:8080/ as an authorized redirect URI in Google Cloud Console',
      );
    } else if (!kIsWeb) {
      // For mobile platforms, we don't need to specify clientId
      _googleSignIn = GoogleSignIn(scopes: ['email', 'profile']);
    } else {
      print(
        'Google Sign-In client ID not configured. Google Sign-In will be disabled.',
      );
    }
  }

  Future<void> _loadUserData() async {
    final prefs = await SharedPreferences.getInstance();
    _userEmail = prefs.getString('userEmail');
    _userName = prefs.getString('userName');
    _userPhotoUrl = prefs.getString('userPhotoUrl');
    _isSignedIn = _userEmail != null;
    notifyListeners();
  }

  Future<void> _saveUserData() async {
    final prefs = await SharedPreferences.getInstance();
    if (_userEmail != null) {
      prefs.setString('userEmail', _userEmail!);
    }
    if (_userName != null) {
      prefs.setString('userName', _userName!);
    }
    if (_userPhotoUrl != null) {
      prefs.setString('userPhotoUrl', _userPhotoUrl!);
    }
  }

  Future<bool> signInWithGoogle() async {
    if (_googleSignIn == null) {
      print(
        'Google Sign-In is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env file.',
      );
      return false;
    }

    try {
      final GoogleSignInAccount? googleUser = await _googleSignIn!.signIn();
      if (googleUser == null) {
        return false;
      }

      _userEmail = googleUser.email
          .toLowerCase(); // Normalize email to lowercase
      _userName = googleUser.displayName;
      _userPhotoUrl = googleUser.photoUrl;
      _isSignedIn = true;

      print('Signed in with Google: $_userEmail');

      await _saveUserData();
      notifyListeners();
      return true;
    } catch (error) {
      print('Error signing in with Google: $error');
      return false;
    }
  }

  Future<bool> signInWithEmailPassword(String email, String password) async {
    try {
      // For testing purposes, we'll accept any email/password combination
      // In a real app, you would validate against a backend
      _userEmail = email.toLowerCase(); // Normalize email to lowercase
      _userName = email.split('@')[0]; // Use part of email as name
      _userPhotoUrl = null;
      _isSignedIn = true;

      print('Signed in with email: $_userEmail');

      await _saveUserData();
      notifyListeners();
      return true;
    } catch (error) {
      print('Error signing in with email/password: $error');
      return false;
    }
  }

  Future<bool> signInAsTestUser() async {
    try {
      _userEmail = testEmail;
      _userName = 'Test User';
      _userPhotoUrl = null;
      _isSignedIn = true;

      // Print debug info
      print('Signed in as test user: $_userEmail');

      await _saveUserData();
      notifyListeners();
      return true;
    } catch (error) {
      print('Error signing in as test user: $error');
      return false;
    }
  }

  Future<void> signOut() async {
    try {
      if (_googleSignIn != null) {
        await _googleSignIn!.signOut();
      }

      final prefs = await SharedPreferences.getInstance();
      prefs.remove('userEmail');
      prefs.remove('userName');
      prefs.remove('userPhotoUrl');

      _userEmail = null;
      _userName = null;
      _userPhotoUrl = null;
      _isSignedIn = false;

      notifyListeners();
    } catch (error) {
      print('Error signing out: $error');
    }
  }
}

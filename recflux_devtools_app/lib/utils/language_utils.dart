import 'package:flutter_syntax_view/flutter_syntax_view.dart';
import 'package:highlight/languages/javascript.dart';

class LanguageUtils {
  static final Map<String, Map<String, dynamic>> supportedLanguages = {
    'javascript': {
      'language': javascript,
      'extension': '.js',
      'syntax': Syntax.JAVASCRIPT,
    },
  };

  static Syntax getSyntaxFor(String language) {
    return supportedLanguages[language.toLowerCase()]?['syntax'] ??
        Syntax.JAVASCRIPT;
  }
}

String getExtensionFromLanguage(String language) {
  switch (language.toLowerCase()) {
    case 'javascript':
      return 'js';
    case 'typescript':
      return 'ts';
    case 'python':
      return 'py';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'dart':
      return 'dart';
    default:
      return 'txt';
  }
}

String getLanguageFromExtension(String extension) {
  switch (extension.toLowerCase()) {
    case 'js':
      return 'javascript';
    case 'ts':
      return 'typescript';
    case 'py':
      return 'python';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'dart':
      return 'dart';
    default:
      return 'text';
  }
}

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

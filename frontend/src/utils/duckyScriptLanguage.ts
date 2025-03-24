import * as monaco from 'monaco-editor';

/**
 * Register DuckyScript language for Monaco Editor
 */
export function registerDuckyScriptLanguage() {
  // Register a new language
  monaco.languages.register({ id: 'duckyscript' });

  // Register a tokens provider for the language
  monaco.languages.setMonarchTokensProvider('duckyscript', {
    tokenizer: {
      root: [
        // Comments
        [/^REM.*$/, 'comment'],
        
        // Keywords/Commands
        [/\b(DELAY|DEFAULTDELAY|DEFAULT_DELAY|STRING|GUI|WINDOWS|APP|MENU|SHIFT|ALT|CONTROL|CTRL|ENTER|DELETE|HOME|INSERT|PAGEUP|PAGEDOWN|UP|DOWN|LEFT|RIGHT|TAB|END|ESC|ESCAPE|SPACE|PAUSE|BREAK|CAPSLOCK|F[1-9]|F1[0-2]|PRINTSCREEN|SCROLLLOCK|NUMLOCK)\b/, 'keyword'],
        
        // Numeric literals
        [/\b\d+\b/, 'number'],
        
        // String literals
        [/"([^"\\]|\\.)*$/, 'string.invalid'], // string with no end quote
        [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
        
        // Special characters
        [/\+/, 'operator'], // For key combinations like CTRL+ALT+DELETE
      ],
      
      string: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
      ],
    }
  });

  // Define a theme with specific token styles
  monaco.editor.defineTheme('duckyscript-theme', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'string.escape', foreground: 'D7BA7D' },
      { token: 'string.invalid', foreground: 'FF0000' },
      { token: 'operator', foreground: 'D4D4D4' },
    ],
    colors: {}
  });

  // Register completions provider
  monaco.languages.registerCompletionItemProvider('duckyscript', {
    provideCompletionItems: (_, position) => {
      const suggestions = [
        // Basic DuckyScript commands
        { 
          label: 'REM', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'REM ', 
          detail: 'Comment line',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'DELAY', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'DELAY ', 
          detail: 'Pause in milliseconds',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'STRING', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'STRING ', 
          detail: 'Type the following string',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'ENTER', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'ENTER', 
          detail: 'Press the Enter key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'GUI', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'GUI ', 
          detail: 'Windows or Command key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'CTRL', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'CTRL ', 
          detail: 'Control key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'SHIFT', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'SHIFT ', 
          detail: 'Shift key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'ALT', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'ALT ', 
          detail: 'Alt key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'ESC', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'ESC', 
          detail: 'Escape key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'TAB', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'TAB', 
          detail: 'Tab key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'SPACE', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'SPACE', 
          detail: 'Space key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        
        // Function keys
        { 
          label: 'F1', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'F1', 
          detail: 'F1 key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'F2', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'F2', 
          detail: 'F2 key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'F3', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'F3', 
          detail: 'F3 key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'F4', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'F4', 
          detail: 'F4 key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'F5', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'F5', 
          detail: 'F5 key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'F6', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'F6', 
          detail: 'F6 key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'F7', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'F7', 
          detail: 'F7 key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'F8', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'F8', 
          detail: 'F8 key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'F9', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'F9', 
          detail: 'F9 key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'F10', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'F10', 
          detail: 'F10 key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'F11', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'F11', 
          detail: 'F11 key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'F12', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'F12', 
          detail: 'F12 key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        
        // Navigation keys
        { 
          label: 'HOME', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'HOME', 
          detail: 'Home key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'END', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'END', 
          detail: 'End key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'INSERT', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'INSERT', 
          detail: 'Insert key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'DELETE', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'DELETE', 
          detail: 'Delete key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'PAGEUP', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'PAGEUP', 
          detail: 'Page Up key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'PAGEDOWN', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'PAGEDOWN', 
          detail: 'Page Down key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'UP', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'UP', 
          detail: 'Up arrow key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'DOWN', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'DOWN', 
          detail: 'Down arrow key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'LEFT', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'LEFT', 
          detail: 'Left arrow key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'RIGHT', 
          kind: monaco.languages.CompletionItemKind.Keyword, 
          insertText: 'RIGHT', 
          detail: 'Right arrow key',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        
        // Common snippets
        { 
          label: 'payload:delay-and-type', 
          kind: monaco.languages.CompletionItemKind.Snippet, 
          insertText: 'DELAY 1000\nSTRING ${1:text}\nENTER',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Wait and type a string',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        { 
          label: 'payload:run-command', 
          kind: monaco.languages.CompletionItemKind.Snippet, 
          insertText: 'GUI r\nDELAY 300\nSTRING ${1:command}\nENTER',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Open Run dialog and execute a command',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        {
          label: 'payload:open-powershell', 
          kind: monaco.languages.CompletionItemKind.Snippet, 
          insertText: 'GUI r\nDELAY 300\nSTRING powershell\nENTER\nDELAY 1000',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Open PowerShell',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        },
        {
          label: 'payload:open-terminal-mac', 
          kind: monaco.languages.CompletionItemKind.Snippet, 
          insertText: 'GUI SPACE\nDELAY 300\nSTRING terminal\nDELAY 300\nENTER\nDELAY 1000',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Open Terminal on macOS',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          }
        }
      ];
      
      return { suggestions };
    }
  });
} 
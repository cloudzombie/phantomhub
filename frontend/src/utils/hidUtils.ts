/**
 * USB HID Protocol Utilities for Keystroke Injection
 * 
 * This module provides utilities for working with USB HID protocol
 * for keystroke injection with the O.MG Cable device.
 */

// USB HID Usage Page Constants
export const HID_USAGE_PAGE = {
  GENERIC_DESKTOP: 0x01,
  KEYBOARD: 0x07,
  CONSUMER: 0x0C
};

// USB HID Report Types
export const HID_REPORT_TYPE = {
  INPUT: 0x01,
  OUTPUT: 0x02,
  FEATURE: 0x03
};

// USB HID Keyboard Modifier Keys
export const KEYBOARD_MODIFIER = {
  LEFT_CONTROL: 0x01,
  LEFT_SHIFT: 0x02,
  LEFT_ALT: 0x04,
  LEFT_GUI: 0x08,  // Windows/Command key
  RIGHT_CONTROL: 0x10,
  RIGHT_SHIFT: 0x20,
  RIGHT_ALT: 0x40,
  RIGHT_GUI: 0x80
};

// USB HID Keyboard Key Codes (subset)
export const KEYBOARD_KEY = {
  // Letters
  A: 0x04,
  B: 0x05,
  C: 0x06,
  D: 0x07,
  E: 0x08,
  F: 0x09,
  G: 0x0A,
  H: 0x0B,
  I: 0x0C,
  J: 0x0D,
  K: 0x0E,
  L: 0x0F,
  M: 0x10,
  N: 0x11,
  O: 0x12,
  P: 0x13,
  Q: 0x14,
  R: 0x15,
  S: 0x16,
  T: 0x17,
  U: 0x18,
  V: 0x19,
  W: 0x1A,
  X: 0x1B,
  Y: 0x1C,
  Z: 0x1D,
  
  // Numbers (top row)
  NUMBER_1: 0x1E,
  NUMBER_2: 0x1F,
  NUMBER_3: 0x20,
  NUMBER_4: 0x21,
  NUMBER_5: 0x22,
  NUMBER_6: 0x23,
  NUMBER_7: 0x24,
  NUMBER_8: 0x25,
  NUMBER_9: 0x26,
  NUMBER_0: 0x27,
  
  // Function keys
  F1: 0x3A,
  F2: 0x3B,
  F3: 0x3C,
  F4: 0x3D,
  F5: 0x3E,
  F6: 0x3F,
  F7: 0x40,
  F8: 0x41,
  F9: 0x42,
  F10: 0x43,
  F11: 0x44,
  F12: 0x45,
  
  // Control keys
  ENTER: 0x28,
  ESCAPE: 0x29,
  BACKSPACE: 0x2A,
  TAB: 0x2B,
  SPACE: 0x2C,
  MINUS: 0x2D,        // - and _
  EQUAL: 0x2E,        // = and +
  BRACKET_LEFT: 0x2F, // [ and {
  BRACKET_RIGHT: 0x30, // ] and }
  BACKSLASH: 0x31,    // \ and |
  SEMICOLON: 0x33,    // ; and :
  QUOTE: 0x34,        // ' and "
  GRAVE: 0x35,        // ` and ~
  COMMA: 0x36,        // , and <
  PERIOD: 0x37,       // . and >
  SLASH: 0x38,        // / and ?
  CAPS_LOCK: 0x39,
  
  // Navigation keys
  PRINT_SCREEN: 0x46,
  SCROLL_LOCK: 0x47,
  PAUSE: 0x48,
  INSERT: 0x49,
  HOME: 0x4A,
  PAGE_UP: 0x4B,
  DELETE: 0x4C,
  END: 0x4D,
  PAGE_DOWN: 0x4E,
  RIGHT_ARROW: 0x4F,
  LEFT_ARROW: 0x50,
  DOWN_ARROW: 0x51,
  UP_ARROW: 0x52,
  
  // Keypad
  NUM_LOCK: 0x53,
  KEYPAD_DIVIDE: 0x54,
  KEYPAD_MULTIPLY: 0x55,
  KEYPAD_SUBTRACT: 0x56,
  KEYPAD_ADD: 0x57,
  KEYPAD_ENTER: 0x58,
  KEYPAD_1: 0x59,
  KEYPAD_2: 0x5A,
  KEYPAD_3: 0x5B,
  KEYPAD_4: 0x5C,
  KEYPAD_5: 0x5D,
  KEYPAD_6: 0x5E,
  KEYPAD_7: 0x5F,
  KEYPAD_8: 0x60,
  KEYPAD_9: 0x61,
  KEYPAD_0: 0x62,
  KEYPAD_DECIMAL: 0x63,
  
  // Additional keys
  APPLICATION: 0x65, // Menu key
  POWER: 0x66,
  KEYPAD_EQUAL: 0x67
};

// Standard O.MG HID Report Structure
// [ReportID, Modifiers, Reserved, Key1, Key2, Key3, Key4, Key5, Key6]
export interface HIDReport {
  reportId: number;
  modifiers: number;
  reserved?: number;
  keyCodes: number[];
}

/**
 * Creates a standard keystroke HID report
 * @param modifiers Bit flags for modifier keys (ctrl, shift, etc)
 * @param keyCodes Array of key codes to press (up to 6)
 * @returns HID report structure
 */
export function createKeystrokeReport(modifiers: number = 0, keyCodes: number[] = []): HIDReport {
  return {
    reportId: 0x01,  // Standard keyboard report ID
    modifiers,
    reserved: 0,
    keyCodes: keyCodes.slice(0, 6)  // USB HID supports up to 6 simultaneous keys
  };
}

/**
 * Creates a HID report for releasing all keys (no keys pressed)
 * @returns HID report with all keys released
 */
export function createReleaseReport(): HIDReport {
  return createKeystrokeReport(0, [0, 0, 0, 0, 0, 0]);
}

/**
 * Converts a HID report to byte array for sending to device
 * @param report HID report object
 * @returns Uint8Array representation of the report
 */
export function reportToBytes(report: HIDReport): Uint8Array {
  const bytes = new Uint8Array(8);
  bytes[0] = report.reportId;
  bytes[1] = report.modifiers;
  bytes[2] = report.reserved || 0;
  
  // Fill key codes (or zeros if fewer than 6 keys)
  for (let i = 0; i < 6; i++) {
    bytes[i + 2] = report.keyCodes[i] || 0;
  }
  
  return bytes;
}

/**
 * Converts a single character to its corresponding key code and modifiers
 * @param char Single character to convert
 * @returns Object with keyCode and modifiers
 */
export function charToKeyCode(char: string): { keyCode: number; modifiers: number } {
  const c = char.toUpperCase();
  let keyCode = 0;
  let modifiers = 0;
  
  // Handle letters
  if (/^[A-Z]$/.test(c)) {
    keyCode = KEYBOARD_KEY[c as keyof typeof KEYBOARD_KEY];
    // If original char was lowercase, no shift needed
    // If original char was uppercase, add shift modifier
    if (char !== char.toLowerCase()) {
      modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
    }
  }
  // Handle numbers
  else if (/^[0-9]$/.test(char)) {
    const numKey = `NUMBER_${char}` as keyof typeof KEYBOARD_KEY;
    keyCode = KEYBOARD_KEY[numKey];
  }
  // Handle special characters
  else {
    switch (char) {
      case ' ':
        keyCode = KEYBOARD_KEY.SPACE;
        break;
      case '!':
        keyCode = KEYBOARD_KEY.NUMBER_1;
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      case '@':
        keyCode = KEYBOARD_KEY.NUMBER_2;
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      case '#':
        keyCode = KEYBOARD_KEY.NUMBER_3;
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      case '$':
        keyCode = KEYBOARD_KEY.NUMBER_4;
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      case '%':
        keyCode = KEYBOARD_KEY.NUMBER_5;
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      case '^':
        keyCode = KEYBOARD_KEY.NUMBER_6;
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      case '&':
        keyCode = KEYBOARD_KEY.NUMBER_7;
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      case '*':
        keyCode = KEYBOARD_KEY.NUMBER_8;
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      case '(':
        keyCode = KEYBOARD_KEY.NUMBER_9;
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      case ')':
        keyCode = KEYBOARD_KEY.NUMBER_0;
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      case '-':
        keyCode = KEYBOARD_KEY.MINUS;
        break;
      case '_':
        keyCode = KEYBOARD_KEY.MINUS;
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      case '=':
        keyCode = KEYBOARD_KEY.EQUAL;
        break;
      case '+':
        keyCode = KEYBOARD_KEY.EQUAL;
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      case '[':
        keyCode = KEYBOARD_KEY.BRACKET_LEFT;
        break;
      case '{':
        keyCode = KEYBOARD_KEY.BRACKET_LEFT;
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      case ']':
        keyCode = KEYBOARD_KEY.BRACKET_RIGHT;
        break;
      case '}':
        keyCode = KEYBOARD_KEY.BRACKET_RIGHT;
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      case '\\':
        keyCode = KEYBOARD_KEY.BACKSLASH;
        break;
      case '|':
        keyCode = KEYBOARD_KEY.BACKSLASH;
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      case ';':
        keyCode = KEYBOARD_KEY.SEMICOLON;
        break;
      case ':':
        keyCode = KEYBOARD_KEY.SEMICOLON;
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      case '\'':
        keyCode = KEYBOARD_KEY.QUOTE;
        break;
      case '"':
        keyCode = KEYBOARD_KEY.QUOTE;
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      case '`':
        keyCode = KEYBOARD_KEY.GRAVE;
        break;
      case '~':
        keyCode = KEYBOARD_KEY.GRAVE;
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      case ',':
        keyCode = KEYBOARD_KEY.COMMA;
        break;
      case '<':
        keyCode = KEYBOARD_KEY.COMMA;
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      case '.':
        keyCode = KEYBOARD_KEY.PERIOD;
        break;
      case '>':
        keyCode = KEYBOARD_KEY.PERIOD;
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      case '/':
        keyCode = KEYBOARD_KEY.SLASH;
        break;
      case '?':
        keyCode = KEYBOARD_KEY.SLASH;
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      default:
        // For unsupported characters, return 0
        keyCode = 0;
    }
  }
  
  return { keyCode, modifiers };
}

/**
 * Convert a named key to its keycode and modifiers
 * @param keyName Key name (e.g., "ENTER", "F1", "CTRL+ALT+DELETE")
 * @returns Object with keyCode and modifiers
 */
export function namedKeyToKeyCode(keyName: string): { keyCode: number; modifiers: number } {
  let modifiers = 0;
  let keyCode = 0;
  
  // Handle compound keys (e.g., CTRL+ALT+DELETE)
  const keyParts = keyName.toUpperCase().split('+');
  
  // Last part is the key, everything before is a modifier
  const mainKey = keyParts.pop() || '';
  
  // Process modifiers
  keyParts.forEach(mod => {
    switch (mod) {
      case 'CTRL':
      case 'CONTROL':
        modifiers |= KEYBOARD_MODIFIER.LEFT_CONTROL;
        break;
      case 'SHIFT':
        modifiers |= KEYBOARD_MODIFIER.LEFT_SHIFT;
        break;
      case 'ALT':
        modifiers |= KEYBOARD_MODIFIER.LEFT_ALT;
        break;
      case 'GUI':
      case 'WINDOWS':
      case 'COMMAND':
      case 'WIN':
      case 'CMD':
        modifiers |= KEYBOARD_MODIFIER.LEFT_GUI;
        break;
    }
  });
  
  // Process the main key
  if (mainKey in KEYBOARD_KEY) {
    keyCode = KEYBOARD_KEY[mainKey as keyof typeof KEYBOARD_KEY];
  }
  
  return { keyCode, modifiers };
}

/**
 * Converts a string to a sequence of HID reports for typing
 * @param text String to convert to key presses
 * @returns Array of HID reports for pressing and releasing each key
 */
export function stringToKeyReports(text: string): HIDReport[] {
  const reports: HIDReport[] = [];
  
  for (const char of text) {
    const { keyCode, modifiers } = charToKeyCode(char);
    
    // If valid keycode found
    if (keyCode !== 0) {
      // Press the key
      reports.push(createKeystrokeReport(modifiers, [keyCode]));
      // Release all keys
      reports.push(createReleaseReport());
    }
  }
  
  return reports;
}

/**
 * Converts a DuckyScript command to HID reports
 * @param command DuckyScript command to convert
 * @returns Array of HID reports, or null if command can't be converted to reports
 */
export function duckyCommandToReports(command: string): HIDReport[] | null {
  const parts = command.trim().split(' ');
  const cmd = parts[0].toUpperCase();
  const arg = parts.slice(1).join(' ');
  
  switch (cmd) {
    case 'STRING':
      return stringToKeyReports(arg);
      
    case 'ENTER':
      return [
        createKeystrokeReport(0, [KEYBOARD_KEY.ENTER]),
        createReleaseReport()
      ];
      
    case 'DELAY':
      // DELAY commands don't generate HID reports
      return [];
      
    case 'GUI':
    case 'WINDOWS':
    case 'COMMAND':
      if (arg) {
        const { keyCode } = charToKeyCode(arg);
        return [
          createKeystrokeReport(KEYBOARD_MODIFIER.LEFT_GUI, [keyCode]),
          createReleaseReport()
        ];
      } else {
        return [
          createKeystrokeReport(KEYBOARD_MODIFIER.LEFT_GUI, []),
          createReleaseReport()
        ];
      }
      
    case 'CONTROL':
    case 'CTRL':
      if (arg) {
        const { keyCode } = charToKeyCode(arg);
        return [
          createKeystrokeReport(KEYBOARD_MODIFIER.LEFT_CONTROL, [keyCode]),
          createReleaseReport()
        ];
      } else {
        return [
          createKeystrokeReport(KEYBOARD_MODIFIER.LEFT_CONTROL, []),
          createReleaseReport()
        ];
      }
      
    case 'ALT':
      if (arg) {
        const { keyCode } = charToKeyCode(arg);
        return [
          createKeystrokeReport(KEYBOARD_MODIFIER.LEFT_ALT, [keyCode]),
          createReleaseReport()
        ];
      } else {
        return [
          createKeystrokeReport(KEYBOARD_MODIFIER.LEFT_ALT, []),
          createReleaseReport()
        ];
      }
      
    case 'SHIFT':
      if (arg) {
        const { keyCode } = charToKeyCode(arg);
        return [
          createKeystrokeReport(KEYBOARD_MODIFIER.LEFT_SHIFT, [keyCode]),
          createReleaseReport()
        ];
      } else {
        return [
          createKeystrokeReport(KEYBOARD_MODIFIER.LEFT_SHIFT, []),
          createReleaseReport()
        ];
      }
      
    default:
      // Check if the command is a special key
      const specialKey = cmd as keyof typeof KEYBOARD_KEY;
      if (specialKey in KEYBOARD_KEY) {
        return [
          createKeystrokeReport(0, [KEYBOARD_KEY[specialKey]]),
          createReleaseReport()
        ];
      }
      
      // If we don't recognize the command, return null
      return null;
  }
}

/**
 * Calculate typing speed metrics based on payload size and device capabilities
 * @param payload DuckyScript payload
 * @param maxKeysPerSecond Maximum keys per second the device can handle
 * @returns Object with execution metrics
 */
export function calculateTypingMetrics(payload: string, maxKeysPerSecond: number = 890): {
  keystrokes: number;
  estimatedTimeMs: number;
  keysPerSecond: number;
} {
  const lines = payload.split('\n');
  let keystrokeCount = 0;
  let manualDelayMs = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('REM')) {
      continue;
    }
    
    const parts = trimmed.split(' ');
    const cmd = parts[0].toUpperCase();
    
    if (cmd === 'STRING') {
      // Each character in a STRING is one keystroke
      keystrokeCount += parts.slice(1).join(' ').length;
    } else if (cmd === 'DELAY') {
      // DELAY adds milliseconds to the execution time
      manualDelayMs += parseInt(parts[1], 10) || 0;
    } else if (cmd === 'DEFAULTDELAY' || cmd === 'DEFAULT_DELAY') {
      // DEFAULTDELAY affects every line, but we calculate this separately
      // as we would need to count the remaining commands
    } else {
      // Each other command is generally one keystroke
      keystrokeCount += 1;
    }
  }
  
  // Calculate base time required for keystrokes
  const baseExecutionTimeMs = (keystrokeCount / maxKeysPerSecond) * 1000;
  
  // Add manual delays
  const totalExecutionTimeMs = baseExecutionTimeMs + manualDelayMs;
  
  // Calculate effective keys per second
  const effectiveKeysPerSecond = keystrokeCount / (totalExecutionTimeMs / 1000);
  
  return {
    keystrokes: keystrokeCount,
    estimatedTimeMs: totalExecutionTimeMs,
    keysPerSecond: effectiveKeysPerSecond
  };
} 
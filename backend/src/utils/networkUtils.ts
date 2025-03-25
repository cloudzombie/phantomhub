/**
 * Network Utility Functions
 * 
 * Provides utilities for network operations like ping, connectivity testing,
 * and IP address validation.
 */

import * as net from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execPromise = promisify(exec);

/**
 * Check if an IP address is valid
 * @param ip IP address to check
 * @returns Boolean indicating if the IP is valid
 */
export function isValidIpAddress(ip: string): boolean {
  // IPv4 validation pattern
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  
  if (!ipv4Pattern.test(ip)) {
    return false;
  }
  
  // Check each octet is in valid range (0-255)
  const octets = ip.split('.');
  return octets.every(octet => {
    const num = parseInt(octet, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Ping an IP address to check if it's reachable
 * Uses platform-specific methods for best reliability
 * @param ip IP address to ping
 * @param timeoutMs Timeout in milliseconds (default 3000)
 * @returns Promise resolving to boolean indicating if the host is reachable
 */
export async function ping(ip: string, timeoutMs: number = 3000): Promise<boolean> {
  // Validate the IP first
  if (!isValidIpAddress(ip)) {
    throw new Error(`Invalid IP address: ${ip}`);
  }
  
  // Try TCP connection first as it's faster and more reliable in most environments
  try {
    return await tcpPing(ip, 80, timeoutMs);
  } catch (error) {
    // If TCP ping fails, try system ping command as fallback
    return await systemPing(ip, timeoutMs);
  }
}

/**
 * Check if a host is reachable by establishing a TCP connection
 * @param host Hostname or IP address
 * @param port Port to connect to (default 80)
 * @param timeoutMs Timeout in milliseconds
 * @returns Promise resolving to boolean indicating if the host is reachable
 */
async function tcpPing(host: string, port: number = 80, timeoutMs: number = 3000): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;
    
    // Set timeout
    socket.setTimeout(timeoutMs);
    
    // Handle successful connection
    socket.on('connect', () => {
      isResolved = true;
      socket.destroy();
      resolve(true);
    });
    
    // Handle timeout
    socket.on('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });
    
    // Handle errors
    socket.on('error', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });
    
    // Attempt connection
    socket.connect(port, host);
  });
}

/**
 * Ping a host using the system ping command
 * @param host Hostname or IP address
 * @param timeoutMs Timeout in milliseconds
 * @returns Promise resolving to boolean indicating if the host is reachable
 */
async function systemPing(host: string, timeoutMs: number = 3000): Promise<boolean> {
  try {
    // Format timeout to seconds, minimum 1 second
    const timeoutSec = Math.max(Math.ceil(timeoutMs / 1000), 1);
    
    // Use different ping commands based on OS
    let command = '';
    
    switch (os.platform()) {
      case 'win32':
        command = `ping -n 1 -w ${timeoutMs} ${host}`;
        break;
      case 'darwin': // macOS
        command = `ping -c 1 -t ${timeoutSec} ${host}`;
        break;
      default: // Linux and others
        command = `ping -c 1 -W ${timeoutSec} ${host}`;
        break;
    }
    
    const { stdout } = await execPromise(command);
    
    // Check for responses indicating success
    return (stdout.includes('ttl=') || // Windows, Linux
            stdout.includes('time=') || // General response
            stdout.includes('bytes from')); // Standard ping output
  } catch (error) {
    // If ping command fails, host is unreachable
    return false;
  }
}

/**
 * Get the local IP address of the machine
 * @returns Promise resolving to the primary local IP address
 */
export function getLocalIPAddress(): string | null {
  const interfaces = os.networkInterfaces();
  
  for (const interfaceName in interfaces) {
    const networkInterface = interfaces[interfaceName];
    
    if (!networkInterface) continue;
    
    for (const iface of networkInterface) {
      // Skip internal, non-IPv4 addresses
      if (!iface.internal && iface.family === 'IPv4') {
        return iface.address;
      }
    }
  }
  
  return null;
} 
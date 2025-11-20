/**
 * Centralized Client URL Configuration
 * 
 * Usage:
 * - If CLIENT_URL is set in .env, it will be used (live server mode)
 * - If CLIENT_URL is commented/not set, defaults to localhost (development mode)
 * 
 * To switch between modes:
 * - Live server: Uncomment CLIENT_URL in .env file
 * - Localhost: Comment or remove CLIENT_URL from .env file
 */

import "dotenv/config";

// Default localhost URL
const DEFAULT_LOCALHOST_URL = 'http://localhost:5173';

// Live server URL (can be overridden by CLIENT_URL env variable)
const DEFAULT_LIVE_URL = 'https://code-guard-client-side.vercel.app';

// Check if CLIENT_URL is set in environment
const isLiveServer = !!process.env.CLIENT_URL;

// Get the active client URL
const getClientUrl = () => {
  if (isLiveServer) {
    // Use CLIENT_URL from .env if set, otherwise use default live URL
    return process.env.CLIENT_URL || DEFAULT_LIVE_URL;
  }
  // Return localhost URL for development
  return DEFAULT_LOCALHOST_URL;
};

// Get all allowed origins for CORS
const getAllowedOrigins = () => {
  const origins = [DEFAULT_LOCALHOST_URL]; // Always include localhost for development
  
  if (isLiveServer) {
    // Include live server URL if in live mode
    const liveUrl = process.env.CLIENT_URL || DEFAULT_LIVE_URL;
    if (!origins.includes(liveUrl)) {
      origins.push(liveUrl);
    }
  }
  
  return origins.filter(Boolean);
};

// Export configuration
export const clientConfig = {
  // Current active client URL
  clientUrl: getClientUrl(),
  
  // All allowed origins for CORS
  allowedOrigins: getAllowedOrigins(),
  
  // Whether we're running in live server mode
  isLiveServer,
  
  // Default URLs
  localhostUrl: DEFAULT_LOCALHOST_URL,
  liveUrl: DEFAULT_LIVE_URL,
};

// Log configuration on import
console.log('🌐 Client Configuration:');
console.log(`   Mode: ${isLiveServer ? 'LIVE SERVER' : 'LOCALHOST (Development)'}`);
console.log(`   Active Client URL: ${clientConfig.clientUrl}`);
console.log(`   Allowed Origins: ${clientConfig.allowedOrigins.join(', ')}`);

export default clientConfig;


import ImageKit from "imagekit";
import "dotenv/config";

// Check if ImageKit credentials are available
const hasImageKitConfig = 
  process.env.IMAGEKIT_PUBLIC_KEY && 
  process.env.IMAGEKIT_PRIVATE_KEY && 
  process.env.IMAGEKIT_URL_ENDPOINT;

let imagekit = null;

// Only initialize ImageKit if all required environment variables are present
if (hasImageKitConfig) {
  try {
    imagekit = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT, 
    });
    console.log("✅ ImageKit initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing ImageKit:", error.message);
    imagekit = null;
  }
} else {
  console.warn("⚠️ ImageKit not configured - missing environment variables:");
  console.warn("   IMAGEKIT_PUBLIC_KEY:", process.env.IMAGEKIT_PUBLIC_KEY ? "✓ Set" : "✗ Missing");
  console.warn("   IMAGEKIT_PRIVATE_KEY:", process.env.IMAGEKIT_PRIVATE_KEY ? "✓ Set" : "✗ Missing");
  console.warn("   IMAGEKIT_URL_ENDPOINT:", process.env.IMAGEKIT_URL_ENDPOINT ? "✓ Set" : "✗ Missing");
  console.warn("   ImageKit features will be disabled until configured.");
}

export { imagekit };


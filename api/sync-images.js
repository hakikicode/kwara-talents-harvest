import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let storage;
try {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT || '{}'
  );
  
  if (Object.keys(serviceAccount).length > 0) {
    const app = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
    storage = getStorage(app).bucket();
  }
} catch (err) {
  console.warn('Firebase Admin not configured:', err.message);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if Firebase is configured
    if (!storage) {
      return res.status(500).json({
        error: 'Firebase Storage not configured. Set FIREBASE_SERVICE_ACCOUNT env var.'
      });
    }

    // Get events folder path
    const eventsFolder = path.join(__dirname, '../../public/events');
    
    // Read all image files from events folder
    const files = await fs.readdir(eventsFolder);
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    ).sort();

    if (imageFiles.length === 0) {
      return res.status(400).json({
        error: 'No image files found in /public/events folder'
      });
    }

    const uploadedUrls = {};
    const errors = [];

    // Upload each image to Firebase Storage
    for (const imageFile of imageFiles) {
      try {
        const filePath = path.join(eventsFolder, imageFile);
        const fileBuffer = await fs.readFile(filePath);
        
        const storageFileName = `events/${imageFile}`;
        const file = storage.file(storageFileName);

        // Upload file
        await file.save(fileBuffer, {
          metadata: {
            contentType: getMimeType(imageFile),
            cacheControl: 'public, max-age=31536000'
          },
          public: true
        });

        // Get public URL
        const publicUrl = `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/events/${encodeURIComponent(imageFile)}`;
        uploadedUrls[imageFile] = publicUrl;

        console.log(`✅ Uploaded: ${imageFile}`);
      } catch (err) {
        console.error(`❌ Error uploading ${imageFile}:`, err.message);
        errors.push({ file: imageFile, error: err.message });
      }
    }

    // Generate contestants.json from uploaded images
    const contestants = imageFiles.map((imageFile, index) => {
      const id = String(index + 1).padStart(2, '0');
      return {
        id,
        name: `Contestant ${id}`,
        image: uploadedUrls[imageFile] || `events/${imageFile}`
      };
    });

    // Save updated contestants.json
    const contestantsPath = path.join(__dirname, '../../public/events/contestants.json');
    await fs.writeFile(
      contestantsPath,
      JSON.stringify(contestants, null, 2),
      'utf-8'
    );

    console.log(`✅ Updated contestants.json with ${contestants.length} entries`);

    return res.json({
      success: true,
      message: `Successfully uploaded ${imageFiles.length} images and updated contestants.json`,
      uploaded: Object.keys(uploadedUrls).length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      contestants
    });

  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to sync images'
    });
  }
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  return types[ext] || 'image/jpeg';
}

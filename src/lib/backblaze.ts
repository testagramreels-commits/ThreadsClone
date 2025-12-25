import { supabase } from './supabase';

/**
 * Upload a file to Backblaze B2 storage via Edge Function
 * Best for large files like videos
 */
export async function uploadToBackblaze(
  file: File,
  fileName?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result as string;
        const actualFileName = fileName || `${Date.now()}_${file.name}`;

        const { data, error } = await supabase.functions.invoke('backblaze-upload', {
          body: {
            fileName: actualFileName,
            fileType: file.type,
            fileData: base64Data,
          },
        });

        if (error) {
          console.error('Backblaze upload error:', error);
          reject(new Error(error.message || 'Failed to upload to Backblaze'));
          return;
        }

        if (!data?.url) {
          reject(new Error('No URL returned from Backblaze'));
          return;
        }

        resolve(data.url);
      } catch (err) {
        console.error('Upload error:', err);
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Upload video with progress tracking
 */
export async function uploadVideoToBackblaze(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  // For large files, we can add chunking in the future
  // For now, show indeterminate progress
  if (onProgress) {
    onProgress(0);
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be logged in to upload videos');

    const fileName = `videos/${user.id}/${Date.now()}_${file.name}`;
    
    if (onProgress) {
      onProgress(50);
    }

    const url = await uploadToBackblaze(file, fileName);
    
    if (onProgress) {
      onProgress(100);
    }

    return url;
  } catch (error) {
    if (onProgress) {
      onProgress(0);
    }
    throw error;
  }
}

/**
 * Check if Backblaze is configured
 */
export async function isBackblazeConfigured(): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('backblaze-upload', {
      body: {
        fileName: 'test',
        fileData: 'dGVzdA==', // base64 'test'
      },
    });

    // If we get a specific error about missing fields, Backblaze is configured
    // If we get credential errors, it's not configured
    return !error?.message?.includes('credentials not configured');
  } catch {
    return false;
  }
}

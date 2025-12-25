import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

interface UploadRequest {
  fileName: string;
  fileType: string;
  fileData: string; // base64 encoded
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { fileName, fileType, fileData }: UploadRequest = await req.json();

    if (!fileName || !fileData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Backblaze credentials from environment
    const keyId = Deno.env.get('BACKBLAZE_KEY_ID');
    const applicationKey = Deno.env.get('BACKBLAZE_APPLICATION_KEY');
    const bucketId = Deno.env.get('BACKBLAZE_BUCKET_ID');
    const bucketName = Deno.env.get('BACKBLAZE_BUCKET_NAME');

    if (!keyId || !applicationKey || !bucketId || !bucketName) {
      return new Response(
        JSON.stringify({ error: 'Backblaze credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Backblaze] Starting upload process for:', fileName);

    // Step 1: Authorize with Backblaze
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(`${keyId}:${applicationKey}`),
      },
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('[Backblaze] Authorization failed:', errorText);
      throw new Error(`Backblaze authorization failed: ${errorText}`);
    }

    const authData = await authResponse.json();
    const { authorizationToken, apiUrl, downloadUrl } = authData;

    console.log('[Backblaze] Authorization successful');

    // Step 2: Get upload URL
    const uploadUrlResponse = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bucketId }),
    });

    if (!uploadUrlResponse.ok) {
      const errorText = await uploadUrlResponse.text();
      console.error('[Backblaze] Get upload URL failed:', errorText);
      throw new Error(`Failed to get upload URL: ${errorText}`);
    }

    const uploadUrlData = await uploadUrlResponse.json();
    const { uploadUrl, authorizationToken: uploadToken } = uploadUrlData;

    console.log('[Backblaze] Upload URL obtained');

    // Step 3: Convert base64 to binary
    const base64Data = fileData.includes('base64,') 
      ? fileData.split('base64,')[1] 
      : fileData;
    
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log('[Backblaze] File size:', bytes.length, 'bytes');

    // Step 4: Calculate SHA1 hash
    const hashBuffer = await crypto.subtle.digest('SHA-1', bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha1Hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('[Backblaze] SHA1 hash calculated:', sha1Hash);

    // Step 5: Upload file
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': uploadToken,
        'X-Bz-File-Name': encodeURIComponent(fileName),
        'Content-Type': fileType || 'application/octet-stream',
        'Content-Length': bytes.length.toString(),
        'X-Bz-Content-Sha1': sha1Hash,
      },
      body: bytes,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[Backblaze] Upload failed:', errorText);
      throw new Error(`Upload failed: ${errorText}`);
    }

    const uploadData = await uploadResponse.json();
    console.log('[Backblaze] Upload successful:', uploadData.fileName);

    // Construct public URL
    const publicUrl = `${downloadUrl}/file/${bucketName}/${fileName}`;

    // Also store reference in Supabase for tracking
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Get user from request
      const authHeader = req.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');
      
      if (token) {
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user) {
          // Store metadata in a tracking table (optional)
          console.log('[Backblaze] File uploaded by user:', user.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        fileName: uploadData.fileName,
        fileId: uploadData.fileId,
        size: bytes.length,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[Backblaze] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

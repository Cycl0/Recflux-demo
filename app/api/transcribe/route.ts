import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const AUDIO_DIR = join(process.cwd(), 'temp-audio');
const WHISPER_CONTAINER = 'rec-whisper-stt';

// Helper function to process transcription with given file paths
async function processTranscription(
  finalFileName: string,
  finalFilePath: string,
  dockerHostAudioPath: string
) {
  const dockerVolumePath = `${dockerHostAudioPath}\\${finalFileName}`;
  const dockerContainerPath = `/audio/${finalFileName}`;

  console.log(`[Transcription API] Processing with: ${finalFilePath}`);
  console.log(`[Transcription API] Docker volume path: ${dockerVolumePath}`);
  console.log(`[Transcription API] Container path: ${dockerContainerPath}`);

  // Copy final file to Docker mounted volume
  try {
    const { copyFile } = await import('fs/promises');
    await copyFile(finalFilePath, dockerVolumePath);
    console.log(`[Transcription API] ✅ File copied to Docker volume: ${dockerVolumePath}`);
  } catch (copyError) {
    console.error(`[Transcription API] ❌ Failed to copy file to Docker volume: ${copyError.message}`);
    throw new Error(`Failed to copy file to Docker volume: ${copyError.message}`);
  }

  // Prepare commands - try Docker approach first since we know it works
  const commands = [];

  // Docker exec approach (using copied file)
  const isWindows = process.platform === 'win32';
  const dockerCmd = `docker exec ${WHISPER_CONTAINER} curl -s -X POST -F "file=@${dockerContainerPath}" -F "language=pt" -F "response_format=json" http://localhost:8080/inference`;
  commands.push(isWindows
    ? `wsl -d ubuntu bash -c '${dockerCmd.replace(/'/g, "'\\''")}'`
    : dockerCmd);

  // Direct curl as fallback (try local file)
  commands.push(`curl -s -X POST -F "file=@${finalFilePath}" -F "language=pt" -F "response_format=json" http://localhost:8080/inference`);

  console.log(`[Transcription API] Will try ${commands.length} different approaches`);
  console.log(`[Transcription API] Platform: ${process.platform}`);

  let lastError: Error | null = null;
  let result: any = null;

  // Try each command until one works
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    console.log(`[Transcription API] Attempt ${i + 1}/${commands.length}: ${command}`);
    console.log(`[Transcription API] Waiting for transcription (timeout: 120s)...`);

    try {
      const startTime = Date.now();
      const { stdout, stderr } = await execAsync(command, {
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf8'
      });
      const duration = Date.now() - startTime;

      console.log(`[Transcription API] Command completed in ${duration}ms`);

      if (stderr) {
        console.warn(`[Transcription API] Stderr output: ${stderr}`);
      }

      if (!stdout || stdout.trim() === '') {
        throw new Error('Empty response from transcription service');
      }

      console.log(`[Transcription API] Raw stdout (first 500 chars): ${stdout.substring(0, 500)}`);

      try {
        result = JSON.parse(stdout);
        console.log(`[Transcription API] ✅ Parsed JSON successfully`);
        console.log(`[Transcription API] Result keys: ${Object.keys(result).join(', ')}`);

        // Check if Whisper returned an error
        if (result.error) {
          throw new Error(`Whisper API error: ${result.error}`);
        }

        // Check if we have actual transcription text
        if (!result.text && !result.transcript) {
          throw new Error('No transcription text in response');
        }

        console.log(`[Transcription API] ✅ Transcription successful with approach ${i + 1}`);
        break; // Success! Exit the loop
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`[Transcription API] ❌ Attempt ${i + 1} failed: ${lastError.message}`);
      console.error(`[Transcription API] Error details:`, lastError);

      // Continue to next approach
      if (i < commands.length - 1) {
        console.log(`[Transcription API] Trying next approach...`);
        continue;
      }
    }
  }

  // If all approaches failed
  if (!result) {
    throw lastError || new Error('All transcription approaches failed');
  }

  return { result, finalFileName, finalFilePath, dockerVolumePath };
}

export async function POST(request: NextRequest) {
  console.log('[Transcription API] ===== NEW REQUEST =====');

  try {
    // Get the form data from the request
    const formData = await request.formData();
    const audioFile = formData.get('audio') || formData.get('file');

    if (!audioFile || !(audioFile instanceof File)) {
      console.warn('[Transcription API] No audio file found in request');
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Ensure temp directory exists
    await mkdir(AUDIO_DIR, { recursive: true });

    // Create unique filename
    const timestamp = Date.now();
    const fileName = `web_${timestamp}_${audioFile.name}`;
    const filePath = join(AUDIO_DIR, fileName);

    console.log(`[Transcription API] File received: ${fileName}`);
    console.log(`[Transcription API] File size: ${audioFile.size} bytes`);
    console.log(`[Transcription API] File mimetype: ${audioFile.type}`);
    console.log(`[Transcription API] Saving to: ${filePath}`);

    // Docker audio volume path (where container can access files)
    const dockerHostAudioPath = process.platform === 'win32'
      ? 'A:\\Lucas\\Projects\\rec\\.rec\\audio'
      : '/path/to/docker/audio/mount'; // Update this for Linux/macOS

    // Save file to disk locally first
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Always convert to proper WAV format for Whisper compatibility
    // Browser recordings often have wrong extensions (WebM with .wav extension)
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    const finalFileName = `${baseName}_converted.wav`;
    const finalFilePath = join(AUDIO_DIR, finalFileName);

    console.log(`[Transcription API] Converting to proper WAV: ${fileName} (${audioFile.type}) -> ${finalFileName}`);

    // Convert audio to WAV using FFmpeg (always convert to ensure proper format)
    try {
      console.log(`[Transcription API] Starting FFmpeg conversion...`);
      const isWindows = process.platform === 'win32';

      // Convert Windows path to Unix path for WSL
      const wslInputPath = isWindows ? filePath.replace(/\\/g, '/').replace(/([A-Z]):/, (match, p1) => `/mnt/${p1.toLowerCase()}`) : filePath;
      const wslOutputPath = isWindows ? finalFilePath.replace(/\\/g, '/').replace(/([A-Z]):/, (match, p1) => `/mnt/${p1.toLowerCase()}`) : finalFilePath;

      console.log(`[Transcription API] Original Windows path: ${filePath}`);
      console.log(`[Transcription API] Converted WSL input path: ${wslInputPath}`);
      console.log(`[Transcription API] Converted WSL output path: ${wslOutputPath}`);

      const ffmpegCmd = `ffmpeg -y -i "${wslInputPath}" -ar 16000 -ac 1 -c:a pcm_s16le -f wav "${wslOutputPath}"`;
      const command = isWindows
        ? `wsl -d ubuntu bash -c '${ffmpegCmd.replace(/'/g, "'\\''")}'`
        : ffmpegCmd;

      console.log(`[Transcription API] Running FFmpeg: ${command}`);
      console.log(`[Transcription API] Input: ${wslInputPath}`);
      console.log(`[Transcription API] Output: ${wslOutputPath}`);

      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });

      if (stderr && !stderr.includes('duration') && !stderr.includes('size=') && !stderr.includes('bitrate=')) {
        console.warn(`[Transcription API] FFmpeg stderr: ${stderr}`);
      }

      console.log(`[Transcription API] ✅ Audio converted to proper WAV: ${finalFilePath}`);
      console.log(`[Transcription API] FFmpeg stdout: ${stdout}`);

      // Verify the converted file exists and has content
      try {
        const { statSync } = await import('fs');
        const stats = statSync(finalFilePath);
        console.log(`[Transcription API] Converted file size: ${stats.size} bytes`);

        if (stats.size === 0) {
          throw new Error('Converted file is empty');
        }
      } catch (statError) {
        throw new Error(`Failed to verify converted file: ${statError.message}`);
      }
    } catch (ffmpegError) {
      console.error(`[Transcription API] ❌ FFmpeg conversion failed: ${ffmpegError.message}`);
      console.error(`[Transcription API] FFmpeg details:`, ffmpegError);

      // Fallback: try using original file directly (might work if it's actually proper WAV)
      console.log(`[Transcription API] ⚠️ FFmpeg conversion failed, trying fallback...`);

      // Create fallback with different name to avoid conflicts
      const fallbackFileName = `fallback_${Date.now()}.wav`;
      const fallbackFilePath = join(AUDIO_DIR, fallbackFileName);

      // Just copy the original file with proper .wav extension for fallback
      try {
        const { copyFile } = await import('fs/promises');
        await copyFile(filePath, fallbackFilePath);
        console.log(`[Transcription API] Created fallback file: ${fallbackFilePath}`);

        return processTranscription(fallbackFileName, fallbackFilePath, dockerHostAudioPath);
      } catch (copyError) {
        throw new Error(`FFmpeg conversion failed and fallback copy also failed: ${copyError.message}`);
      }
    }

    
    // Process transcription with converted file
    const { result, dockerVolumePath } = await processTranscription(finalFileName, finalFilePath, dockerHostAudioPath);

    console.log(`[Transcription API] Transcription successful`);
    console.log(`[Transcription API] Result: ${JSON.stringify(result, null, 2)}`);

    // Cleanup temp files (original, converted, and Docker volume)
    const cleanupFiles = async () => {
      // Cleanup converted file
      try {
        const { unlink } = await import('fs/promises');
        await unlink(finalFilePath);
        console.log(`[Transcription API] ✅ Cleaned up converted file: ${finalFilePath}`);
      } catch (unlinkError) {
        console.warn(`[Transcription API] Failed to cleanup converted file: ${unlinkError.message}`);
      }

      // Cleanup original file if different from converted (when conversion happened)
      if (filePath !== finalFilePath) {
        try {
          const { unlink } = await import('fs/promises');
          await unlink(filePath);
          console.log(`[Transcription API] ✅ Cleaned up original file: ${filePath}`);
        } catch (unlinkError) {
          console.warn(`[Transcription API] Failed to cleanup original file: ${unlinkError.message}`);
        }
      }

      // Cleanup Docker volume file
      try {
        const { unlink } = await import('fs/promises');
        await unlink(dockerVolumePath);
        console.log(`[Transcription API] ✅ Cleaned up Docker volume file: ${dockerVolumePath}`);
      } catch (unlinkError) {
        console.warn(`[Transcription API] Failed to cleanup Docker volume file: ${unlinkError.message}`);
      }
    };

    await cleanupFiles();

    console.log('[Transcription API] Sending response to client');
    console.log('[Transcription API] ===== REQUEST COMPLETE =====');

    return NextResponse.json(result);

  } catch (error) {
    console.error(`[Transcription API] ===== REQUEST FAILED =====`);
    console.error(`[Transcription API] Error type: error.name`);
    console.error(`[Transcription API] Error message: ${error.message}`);
    console.error(`[Transcription API] Error stack: ${error.stack}`);

    if (error instanceof Error && 'code' in error) {
      console.error(`[Transcription API] Error code: ${(error as any).code}`);
    }
    if (error instanceof Error && 'stderr' in error) {
      console.error(`[Transcription API] Error stderr: ${(error as any).stderr}`);
    }
    if (error instanceof Error && 'stdout' in error) {
      console.error(`[Transcription API] Error stdout: ${(error as any).stdout}`);
    }

    // Attempt cleanup on error
    try {
      if (finalFilePath) {
        const { unlink } = await import('fs/promises');
        await unlink(finalFilePath);
        console.log(`[Transcription API] Cleaned up final file on error: ${finalFilePath}`);
      }
    } catch (unlinkError) {
      console.warn(`[Transcription API] Failed to cleanup final file on error: ${unlinkError.message}`);
    }

    try {
      if (filePath && finalFilePath && filePath !== finalFilePath) {
        const { unlink } = await import('fs/promises');
        await unlink(filePath);
        console.log(`[Transcription API] Cleaned up original file on error: ${filePath}`);
      }
    } catch (unlinkError) {
      console.warn(`[Transcription API] Failed to cleanup original file on error: ${unlinkError.message}`);
    }

    try {
      if (dockerVolumePath) {
        const { unlink } = await import('fs/promises');
        await unlink(dockerVolumePath);
        console.log(`[Transcription API] Cleaned up Docker volume file on error: ${dockerVolumePath}`);
      }
    } catch (unlinkError) {
      console.warn(`[Transcription API] Failed to cleanup Docker volume file on error: ${unlinkError.message}`);
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Check server logs for more information'
    }, { status: 500 });
  }
}
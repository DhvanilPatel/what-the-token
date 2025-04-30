/**
 * Utilities for file handling with progress tracking
 */

/**
 * Read a file as text with progress tracking
 * @param file The file to read
 * @param onProgress Progress callback function
 * @returns Promise that resolves with the file content as text
 */
export function readFileWithProgress(
  file: File,
  onProgress: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    // For small files (< 5MB), just use the standard file reader
    if (file.size < 5 * 1024 * 1024) {
      const reader = new FileReader();

      reader.onload = () => {
        onProgress(100);
        resolve(reader.result as string);
      };

      reader.onerror = () => {
        reject(new Error("Error reading file"));
      };

      reader.readAsText(file);
      return;
    }

    // For larger files, use a chunked approach
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
    const chunks: string[] = [];
    let offset = 0;
    let progress = 0;

    const readNextChunk = () => {
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const reader = new FileReader();

      reader.onload = (e) => {
        if (e.target?.result) {
          chunks.push(e.target.result as string);
        }

        offset += CHUNK_SIZE;
        progress = Math.min(100, Math.round((offset / file.size) * 100));
        onProgress(progress);

        if (offset < file.size) {
          readNextChunk();
        } else {
          resolve(chunks.join(""));
        }
      };

      reader.onerror = () => {
        reject(new Error("Error reading file chunk"));
      };

      reader.readAsText(slice);
    };

    readNextChunk();
  });
}

/**
 * Validate a file is a proper OpenAI conversations export
 * @param data The parsed JSON data
 * @returns Error message if invalid, or null if valid
 */
export function validateOpenAIExport(data: any): string | null {
  if (!data) {
    return "No data found in file";
  }

  if (typeof data !== "object") {
    return "File does not contain valid JSON object";
  }

  // Check for OpenAI conversation structure
  // Basic check for common structures in OpenAI exports
  if (!data.mapping && !data.messages && !Array.isArray(data)) {
    return "This doesn't appear to be a valid OpenAI conversation export";
  }

  return null;
}

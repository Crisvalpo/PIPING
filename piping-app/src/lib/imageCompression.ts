/**
 * Image Compression Utility for Offline-First Storage
 * 
 * Strategy:
 * - Offline: Aggressive compression (800x600, quality 40%) for IndexedDB storage
 * - Online Sync: Upload original high-quality images
 * - Post-Sync: Download HD versions from server
 */

export interface CompressionResult {
    thumbnailBlob: Blob;      // Tiny thumbnail for grids (150x150 @ 30%)
    previewBlob: Blob;        // Medium preview for viewer (800x600 @ 40%)
    originalBlob: Blob;       // Original high-quality
    thumbnailSize: number;
    previewSize: number;
    originalSize: number;
    thumbnailRatio: number;   // Compression ratio for thumbnail
    previewRatio: number;     // Compression ratio for preview
}

/**
 * Compress an image file into multiple versions for offline storage
 * @param file - Original image file
 * @returns Compression result with thumbnail, preview, and original
 */
export async function compressImageForOffline(
    file: File
): Promise<CompressionResult> {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = async () => {
            try {
                // Generate thumbnail (150x150 @ 30% quality)
                const thumbnail = await generateVersion(img, 150, 150, 0.3);

                // Generate preview (800x600 @ 40% quality)
                const preview = await generateVersion(img, 800, 600, 0.4);

                const originalSize = file.size;
                const thumbnailSize = thumbnail.size;
                const previewSize = preview.size;

                const thumbnailRatio = ((originalSize - thumbnailSize) / originalSize) * 100;
                const previewRatio = ((originalSize - previewSize) / originalSize) * 100;

                console.log(`[ImageCompression] ${file.name}:`);
                console.log(`  Thumbnail: ${(thumbnailSize / 1024).toFixed(2)} KB (${thumbnailRatio.toFixed(1)}% reduction)`);
                console.log(`  Preview: ${(previewSize / 1024).toFixed(2)} KB (${previewRatio.toFixed(1)}% reduction)`);
                console.log(`  Original: ${(originalSize / 1024).toFixed(2)} KB`);

                resolve({
                    thumbnailBlob: thumbnail,
                    previewBlob: preview,
                    originalBlob: file,
                    thumbnailSize,
                    previewSize,
                    originalSize,
                    thumbnailRatio,
                    previewRatio
                });
            } catch (error) {
                reject(error);
            }
        };

        img.onerror = () => {
            reject(new Error('Failed to load image'));
        };

        // Load image from file
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Internal helper to generate a compressed version of an image
 */
async function generateVersion(
    img: HTMLImageElement,
    maxWidth: number,
    maxHeight: number,
    quality: number
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
        }

        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > height) {
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
        } else {
            if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
            }
        }

        // Set canvas size to new dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('Failed to compress image'));
                    return;
                }
                resolve(blob);
            },
            'image/jpeg',
            quality
        );
    });
}

/**
 * Compress multiple images in parallel
 * @param files - Array of image files
 * @returns Array of compression results
 */
export async function compressMultipleImages(
    files: File[]
): Promise<CompressionResult[]> {
    return Promise.all(files.map(file => compressImageForOffline(file)));
}

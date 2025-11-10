<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;

class FileHelper
{
    /**
     * Ensure storage symbolic link exists
     * Panggil ini di boot atau middleware untuk memastikan link ada
     */
    public static function ensureStorageLink(): bool
    {
        $storagePath = storage_path('app/public');
        $publicPath = public_path('storage');

        // Check jika link sudah valid
        if (is_link($publicPath)) {
            $target = readlink($publicPath);
            $normalizedTarget = str_replace('\\', '/', $target);
            $normalizedStorage = str_replace('\\', '/', $storagePath);

            if ($normalizedTarget === $normalizedStorage) {
                return true; // Link valid, tidak perlu dibikin ulang
            }
        }

        // Jika directory ada (bukan link), jangan sentuh
        if (is_dir($publicPath) && !is_link($publicPath)) {
            return false;
        }

        // Coba create link
        try {
            // Windows
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                if (function_exists('shell_exec')) {
                    $command = "mklink /D \"{$publicPath}\" \"{$storagePath}\"";
                    @shell_exec($command);
                }
            } else {
                // Unix/Linux
                @symlink($storagePath, $publicPath);
            }

            // Verify
            return is_link($publicPath);
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get accessible file URL yang bekerja di local dan production
     * Automatically ensure link exists
     */
    public static function getAccessibleFileUrl($filePath, $disk = 'public')
    {
        if (!$filePath) {
            return null;
        }

        // Validasi path security
        if (strpos($filePath, '..') !== false) {
            return null;
        }

        // Ensure symbolic link exists sebelum return URL
        if ($disk === 'public') {
            self::ensureStorageLink();
        }

        // Check file exists
        if (!Storage::disk($disk)->exists($filePath)) {
            return null;
        }

        // For 'public' disk, return the storage URL
        // This works because we have symbolic link at public/storage
        $url = Storage::disk($disk)->url($filePath);

        return $url;
    }

    /**
     * Get file response format untuk JSON response
     * Berisi file info dan URL untuk di-render di frontend
     */
    public static function getFileResponse($filePath, $disk = 'public')
    {
        if (!$filePath || !Storage::disk($disk)->exists($filePath)) {
            return null;
        }

        $fullPath = Storage::disk($disk)->path($filePath);

        if (!\File::exists($fullPath)) {
            return null;
        }

        $fileSize = filesize($fullPath);
        $mimeType = \File::mimeType($fullPath);
        $fileName = basename($filePath);

        return [
            'path' => $filePath,
            'url' => self::getAccessibleFileUrl($filePath, $disk),
            'name' => $fileName,
            'mime_type' => $mimeType,
            'size' => $fileSize,
            'size_formatted' => self::formatBytes($fileSize)
        ];
    }

    /**
     * Format bytes ke readable format
     */
    public static function formatBytes($bytes, $precision = 2)
    {
        $units = ['B', 'KB', 'MB', 'GB'];

        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, $precision) . ' ' . $units[$i];
    }

    /**
     * Check apakah file adalah image
     */
    public static function isImage($mimeType)
    {
        $imageMimes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml',
            'image/bmp',
            'image/tiff'
        ];

        return in_array($mimeType, $imageMimes);
    }

    /**
     * Check apakah file adalah PDF
     */
    public static function isPdf($mimeType)
    {
        return $mimeType === 'application/pdf';
    }

    /**
     * Generate thumbnail untuk preview
     * Untuk production, return base64 data atau placeholder
     */
    public static function getThumbnailData($filePath, $disk = 'public', $maxWidth = 200)
    {
        if (!$filePath || !Storage::disk($disk)->exists($filePath)) {
            return null;
        }

        $fullPath = Storage::disk($disk)->path($filePath);
        $mimeType = \File::mimeType($fullPath);

        // Hanya generate thumbnail untuk image
        if (!self::isImage($mimeType)) {
            return null;
        }

        // Return URL - browser akan handle image display
        return [
            'type' => 'image',
            'url' => self::getAccessibleFileUrl($filePath, $disk)
        ];
    }

    /**
     * Validate file security sebelum serve
     */
    public static function validateFileAccess($filePath, $disk = 'public')
    {
        // Prevent directory traversal
        if (strpos($filePath, '..') !== false || strpos($filePath, '\\') !== false) {
            return false;
        }

        // Check file exists di storage
        if (!Storage::disk($disk)->exists($filePath)) {
            return false;
        }

        // Check file exists di disk
        $fullPath = Storage::disk($disk)->path($filePath);
        if (!\File::exists($fullPath)) {
            return false;
        }

        return true;
    }
}

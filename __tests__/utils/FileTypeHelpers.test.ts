/**
 * File Type Helpers Tests
 */

import {
  getFileTypeInfo,
  isImage,
  isAudio,
  isVideo,
  isDocument,
  formatFileSize,
  validateFileSize,
  validateTotalSize,
  getFileExtension,
} from '../../utils/FileTypeHelpers';

describe('FileTypeHelpers', () => {
  describe('getFileTypeInfo', () => {
    it('should identify images correctly', () => {
      const extensions = ['test.jpg', 'test.png', 'test.gif', 'test.webp'];
      
      extensions.forEach(fileName => {
        const info = getFileTypeInfo(fileName);
        expect(info.type).toBe('image');
        expect(info.icon).toBe('image');
        expect(info.category).toBe('Image');
      });
    });

    it('should identify videos correctly', () => {
      const extensions = ['test.mp4', 'test.mov', 'test.avi', 'test.mkv'];
      
      extensions.forEach(fileName => {
        const info = getFileTypeInfo(fileName);
        expect(info.type).toBe('video');
        expect(info.icon).toBe('videocam');
        expect(info.category).toBe('Video');
      });
    });

    it('should identify audio files correctly', () => {
      const extensions = ['test.mp3', 'test.wav', 'test.m4a', 'test.flac'];
      
      extensions.forEach(fileName => {
        const info = getFileTypeInfo(fileName);
        expect(info.type).toBe('audio');
        expect(info.icon).toBe('musical-notes');
        expect(info.category).toBe('Audio');
      });
    });

    it('should identify PDF files correctly', () => {
      const info = getFileTypeInfo('document.pdf');
      expect(info.type).toBe('pdf');
      expect(info.icon).toBe('document-text');
      expect(info.category).toBe('PDF');
    });

    it('should identify documents correctly', () => {
      const extensions = ['test.doc', 'test.docx', 'test.txt', 'test.md'];
      
      extensions.forEach(fileName => {
        const info = getFileTypeInfo(fileName);
        expect(info.type).toBe('document');
        expect(info.category).toBe('Document');
      });
    });

    it('should identify spreadsheets correctly', () => {
      const extensions = ['test.xls', 'test.xlsx', 'test.csv'];
      
      extensions.forEach(fileName => {
        const info = getFileTypeInfo(fileName);
        expect(info.type).toBe('spreadsheet');
        expect(info.category).toBe('Spreadsheet');
      });
    });

    it('should identify presentations correctly', () => {
      const extensions = ['test.ppt', 'test.pptx', 'test.key'];
      
      extensions.forEach(fileName => {
        const info = getFileTypeInfo(fileName);
        expect(info.type).toBe('presentation');
        expect(info.category).toBe('Presentation');
      });
    });

    it('should identify archives correctly', () => {
      const extensions = ['test.zip', 'test.rar', 'test.7z', 'test.tar'];
      
      extensions.forEach(fileName => {
        const info = getFileTypeInfo(fileName);
        expect(info.type).toBe('archive');
        expect(info.category).toBe('Archive');
      });
    });

    it('should identify code files correctly', () => {
      const extensions = ['test.js', 'test.ts', 'test.py', 'test.java'];
      
      extensions.forEach(fileName => {
        const info = getFileTypeInfo(fileName);
        expect(info.type).toBe('code');
        expect(info.category).toBe('Code');
      });
    });

    it('should use MIME type when provided', () => {
      const info = getFileTypeInfo('unknown', 'image/jpeg');
      expect(info.type).toBe('image');
    });

    it('should return default for unknown files', () => {
      const info = getFileTypeInfo('test.unknown');
      expect(info.type).toBe('file');
      expect(info.icon).toBe('document');
      expect(info.category).toBe('File');
    });

    it('should handle files without extension', () => {
      const info = getFileTypeInfo('README');
      expect(info.type).toBe('file');
    });

    it('should be case insensitive', () => {
      const info1 = getFileTypeInfo('TEST.JPG');
      const info2 = getFileTypeInfo('test.jpg');
      
      expect(info1.type).toBe(info2.type);
      expect(info1.icon).toBe(info2.icon);
    });
  });

  describe('isImage', () => {
    it('should identify image files', () => {
      expect(isImage('photo.jpg')).toBe(true);
      expect(isImage('image.png')).toBe(true);
      expect(isImage('graphic.svg')).toBe(true);
    });

    it('should identify data URIs', () => {
      expect(isImage('data:image/png;base64,abc123')).toBe(true);
    });

    it('should identify image paths', () => {
      expect(isImage('/path/to/image/photo.jpg')).toBe(true);
    });

    it('should return false for non-images', () => {
      expect(isImage('document.pdf')).toBe(false);
      expect(isImage('video.mp4')).toBe(false);
      expect(isImage('')).toBe(false);
    });
  });

  describe('isAudio', () => {
    it('should identify audio files', () => {
      expect(isAudio('song.mp3')).toBe(true);
      expect(isAudio('track.m4a')).toBe(true);
      expect(isAudio('audio.wav')).toBe(true);
    });

    it('should identify audio paths', () => {
      expect(isAudio('/path/to/audio/song.mp3')).toBe(true);
    });

    it('should return false for non-audio', () => {
      expect(isAudio('document.pdf')).toBe(false);
      expect(isAudio('')).toBe(false);
    });
  });

  describe('isVideo', () => {
    it('should identify video files', () => {
      expect(isVideo('movie.mp4')).toBe(true);
      expect(isVideo('clip.mov')).toBe(true);
      expect(isVideo('video.avi')).toBe(true);
    });

    it('should identify video paths', () => {
      expect(isVideo('/path/to/video/movie.mp4')).toBe(true);
    });

    it('should return false for non-videos', () => {
      expect(isVideo('document.pdf')).toBe(false);
      expect(isVideo('')).toBe(false);
    });
  });

  describe('isDocument', () => {
    it('should identify document files', () => {
      expect(isDocument('file.pdf')).toBe(true);
      expect(isDocument('doc.docx')).toBe(true);
      expect(isDocument('sheet.xlsx')).toBe(true);
      expect(isDocument('presentation.pptx')).toBe(true);
    });

    it('should identify code files as documents', () => {
      expect(isDocument('script.js')).toBe(true);
      expect(isDocument('code.py')).toBe(true);
    });

    it('should return false for media files', () => {
      expect(isDocument('photo.jpg')).toBe(false);
      expect(isDocument('video.mp4')).toBe(false);
      expect(isDocument('')).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(2048)).toBe('2.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(5242880)).toBe('5.0 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(formatFileSize(1073741824)).toBe('1.0 GB');
      expect(formatFileSize(2147483648)).toBe('2.0 GB');
    });

    it('should handle undefined and zero', () => {
      expect(formatFileSize(undefined)).toBe('0 B');
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('should round to one decimal place', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1638)).toMatch(/1\.[56] KB/); // ~1.6 KB
    });
  });

  describe('validateFileSize', () => {
    it('should validate files within size limit', () => {
      const result = validateFileSize(1024, 2048);
      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should reject files exceeding size limit', () => {
      const result = validateFileSize(3072, 2048);
      expect(result.valid).toBe(false);
      expect(result.message).toBeDefined();
      expect(result.message).toContain('exceeds maximum');
    });

    it('should accept files exactly at the limit', () => {
      const result = validateFileSize(2048, 2048);
      expect(result.valid).toBe(true);
    });

    it('should handle undefined size', () => {
      const result = validateFileSize(undefined, 2048);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateTotalSize', () => {
    it('should validate total size within limit', () => {
      const files = [
        { size: 1024 },
        { size: 2048 },
        { size: 512 },
      ];
      const result = validateTotalSize(files, 5000);
      
      expect(result.valid).toBe(true);
      expect(result.totalSize).toBe(3584);
      expect(result.message).toBeUndefined();
    });

    it('should reject when total size exceeds limit', () => {
      const files = [
        { size: 2000 },
        { size: 2000 },
        { size: 2000 },
      ];
      const result = validateTotalSize(files, 5000);
      
      expect(result.valid).toBe(false);
      expect(result.totalSize).toBe(6000);
      expect(result.message).toBeDefined();
      expect(result.message).toContain('exceeds maximum');
    });

    it('should handle files without size property', () => {
      const files = [
        { size: 1024 },
        {},
        { size: 2048 },
      ];
      const result = validateTotalSize(files, 5000);
      
      expect(result.valid).toBe(true);
      expect(result.totalSize).toBe(3072);
    });

    it('should handle empty files array', () => {
      const result = validateTotalSize([], 5000);
      expect(result.valid).toBe(true);
      expect(result.totalSize).toBe(0);
    });
  });

  describe('getFileExtension', () => {
    it('should extract extension from filename', () => {
      expect(getFileExtension('document.pdf')).toBe('pdf');
      expect(getFileExtension('image.jpg')).toBe('jpg');
      expect(getFileExtension('archive.tar.gz')).toBe('gz');
    });

    it('should handle URIs', () => {
      expect(getFileExtension('file:///path/to/document.pdf')).toBe('pdf');
      expect(getFileExtension('https://example.com/image.jpg')).toBe('jpg');
    });

    it('should return empty string for files without extension', () => {
      expect(getFileExtension('README')).toBe('');
      expect(getFileExtension('Makefile')).toBe('');
    });

    it('should convert to lowercase', () => {
      expect(getFileExtension('Document.PDF')).toBe('pdf');
      expect(getFileExtension('Image.JPG')).toBe('jpg');
    });

    it('should handle empty string', () => {
      expect(getFileExtension('')).toBe('');
    });
  });
});


/**
 * Artifact Types for Mobile
 * 
 * Defines the structure and types for artifacts that can be displayed
 * in the mobile app. Prioritizes mobile-friendly artifact types.
 */

export type ArtifactType =
  | 'code'      // Syntax-highlighted code blocks
  | 'markdown'  // Rich markdown content
  | 'chart'     // Data visualizations
  | 'image'     // Image content
  | 'mermaid'   // Diagrams (rendered as SVG or image)
  | 'html'      // HTML content (read-only in WebView)
  | 'pdf'       // PDF documents
  | 'video';    // Video content

export interface Artifact {
  id: string;
  type: ArtifactType;
  content: string;
  language?: string;
  timestamp: number;
  title?: string;
  messageId?: string;
  isStreaming?: boolean;
  wasStreaming?: boolean; // Marker for completed streaming artifacts
  url?: string; // For PDF/external resources
  file_path?: string; // For backend-generated files
}

export interface ArtifactMetadata {
  type: string;
  title: string;
  language?: string;
  content: string;
  isComplete: boolean;
}

/**
 * Get a user-friendly display name for artifact types
 */
export const getArtifactTypeName = (type: ArtifactType): string => {
  const typeNames: Record<ArtifactType, string> = {
    code: 'Code',
    markdown: 'Document',
    chart: 'Chart',
    image: 'Image',
    mermaid: 'Diagram',
    html: 'Web Page',
    pdf: 'PDF Document',
    video: 'Video',
  };
  return typeNames[type] || 'Artifact';
};

/**
 * Get icon name for artifact types (Ionicons)
 */
export const getArtifactIcon = (type: ArtifactType): string => {
  const iconMap: Record<ArtifactType, string> = {
    code: 'code-slash',
    markdown: 'document-text',
    chart: 'bar-chart',
    image: 'image',
    mermaid: 'git-network',
    html: 'globe',
    pdf: 'document',
    video: 'videocam',
  };
  return iconMap[type] || 'cube';
};

/**
 * Check if artifact type is supported on mobile
 */
export const isArtifactTypeSupported = (type: string): boolean => {
  const supportedTypes: ArtifactType[] = [
    'code',
    'markdown',
    'chart',
    'image',
    'mermaid',
    'html',
    'pdf',
    'video',
  ];
  return supportedTypes.includes(type as ArtifactType);
};

/**
 * Check if artifact type supports code view mode
 */
export const supportsCodeView = (type: ArtifactType): boolean => {
  return ['chart', 'mermaid', 'html', 'pdf'].includes(type);
};


export type BlockType = 'text' | 'paragraph' | 'image' | 'formula' | 'table' | 'video';

export interface ContentBlock {
    type: BlockType;
    data: any;
    id?: string; // Optional client-side ID for tracking
}

export interface TextBlockData {
    html?: string;
    text?: string;
    content?: string;
}

export interface ImageBlockData {
    url?: string;
    file?: { url: string };
    caption?: string;
    width?: number;
    height?: number;
}

export interface FormulaBlockData {
    expression?: string; // LaTeX expression (EditorJS format)
    latex?: string;      // LaTeX expression (API/DB format)
    format?: string;     // 'inline' | 'display'
}

export interface VideoBlockData {
    url?: string;            // Direct video URL fallback (uploaded file or R2 CDN) — may be overwritten by HLS playbackUrl
    rawUrl?: string;         // Original upload URL (R2 CDN or server relay) — never overwritten by polling
    file?: { url: string };  // EditorJS-style file reference
    videoAssetId?: string;   // Primary: VideoAsset ID for adaptive streaming (Shaka Player)
    assetId?: string;        // Legacy alias for videoAssetId
    caption?: string;
    mimeType?: string;       // e.g. 'video/mp4'
    status?: string;         // VideoAsset processing status: PENDING, PROCESSING, READY, FAILED
    isYouTube?: boolean;     // True if video is a YouTube URL embed
}

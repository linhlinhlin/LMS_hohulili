import type { SimulationSectionData } from './simulation.types';

export type BlockType = 'text' | 'formula' | 'image' | 'video' | 'simulation';

export interface BaseBlock {
    id: string; // Unique ID for tracking
    type: BlockType;
}

export interface TextBlock extends BaseBlock {
    type: 'text';
    content: string; // HTML allowed (sanitized)
}

export interface FormulaBlock extends BaseBlock {
    type: 'formula';
    content: string; // LaTeX string
    format: 'inline' | 'display';
}

export interface ImageBlock extends BaseBlock {
    type: 'image';
    url: string; // Remote URL
    caption?: string;
    width?: number; // Preference
    localStatus?: 'synced' | 'pending_download'; // PWA status
    blob?: Blob; // For offline display if stored in IDB
}

export interface VideoBlock extends BaseBlock {
    type: 'video';
    url: string;
    caption?: string;
    mimeType?: string;
    videoAssetId?: string;
    assetId?: string;
}

export interface SimulationBlock extends BaseBlock {
    type: 'simulation';
    data: SimulationSectionData;
}

export type ContentBlock = TextBlock | FormulaBlock | ImageBlock | VideoBlock | SimulationBlock;

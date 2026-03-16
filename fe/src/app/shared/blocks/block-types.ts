export type BlockType = 'text' | 'image' | 'formula' | 'table';

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
    expression: string; // LaTeX expression
}

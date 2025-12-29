export type BlockType = 'text' | 'image' | 'formula' | 'table';

export interface ContentBlock {
    type: BlockType;
    data: any;
    id?: string;
}

export interface TextBlockData {
    html: string;
}

export interface ImageBlockData {
    url?: string;
    file?: { url: string };
    caption?: string;
    width?: number;
    height?: number;
}

export interface FormulaBlockData {
    expression: string;
}

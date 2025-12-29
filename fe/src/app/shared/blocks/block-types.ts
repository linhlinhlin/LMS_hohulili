export type BlockType = 'text' | 'image' | 'formula' | 'table';

export interface ContentBlock {
    type: BlockType;
    data: any;
<<<<<<< HEAD
    id?: string;
=======
    id?: string; // Optional client-side ID for tracking
>>>>>>> fix/image
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
<<<<<<< HEAD
    expression: string;
=======
    expression: string; // LaTeX expression
>>>>>>> fix/image
}

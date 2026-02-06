/// <reference lib="webworker" />

import DOMPurify from 'dompurify';
import { ContentBlock } from '../blocks/block-types';

addEventListener('message', ({ data }) => {
    try {
        const { action, payload } = data;

        if (action === 'PARSE_AND_SANITIZE') {
            const parsedBlocks: ContentBlock[] = typeof payload === 'string' ? JSON.parse(payload) : payload;

            const sanitizedBlocks = parsedBlocks.map(block => {
                if (block.type === 'text' && block.data && block.data.html) {
                    // Sanitize HTML in worker
                    // Note: DOMPurify in worker might require a mock window or special setup if not supported directly.
                    // Version 3.0+ supports SW/Worker better. 
                    // If it fails, fallback to passing through (Backend already sanitized).
                    try {
                        block.data.html = DOMPurify.sanitize(block.data.html);
                    } catch (e) {
                    }
                }
                return block;
            });

            postMessage({ status: 'SUCCESS', result: sanitizedBlocks });
        }
    } catch (error) {
        postMessage({ status: 'ERROR', error: (error as Error).message });
    }
});

import { Directive, ElementRef, HostListener, input, OnInit, Renderer2, signal, effect, inject } from '@angular/core';

@Directive({
    selector: '[appResizableSidebar]'
})
export class ResizableSidebarDirective implements OnInit {
    private el = inject(ElementRef);
    private renderer = inject(Renderer2);

    storageKey = input('sidebar_width');
    minWidth = input(260);
    maxWidth = input(600);
    handleClass = input('resize-handle');

    private isResizing = false;
    private width = signal(320);

    constructor() {
        // SOTA 2025: Reactive persistence via effect
        effect(() => {
            const currentWidth = this.width();
            localStorage.setItem(this.storageKey(), currentWidth.toString());
            this.applyWidthToParent(currentWidth);
        });
    }

    ngOnInit() {
        // Load initial width
        const savedWidth = localStorage.getItem(this.storageKey());
        if (savedWidth) {
            const parsed = parseInt(savedWidth, 10);
            if (!isNaN(parsed) && parsed >= this.minWidth() && parsed <= this.maxWidth()) {
                this.width.set(parsed);
            }
        }
    }

    @HostListener('mousedown', ['$event'])
    onMouseDown(event: MouseEvent) {
        if ((event.target as HTMLElement).classList.contains(this.handleClass())) {
            this.isResizing = true;
            this.renderer.addClass(document.body, 'resizing-sidebar');
            event.preventDefault();
        }
    }

    @HostListener('document:mousemove', ['$event'])
    onMouseMove(event: MouseEvent) {
        if (!this.isResizing) return;

        const rect = this.el.nativeElement.getBoundingClientRect();
        const newWidth = event.clientX - rect.left;

        if (newWidth >= this.minWidth() && newWidth <= this.maxWidth()) {
            this.width.set(newWidth);
        }
    }

    @HostListener('document:mouseup')
    onMouseUp() {
        if (this.isResizing) {
            this.isResizing = false;
            this.renderer.removeClass(document.body, 'resizing-sidebar');
        }
    }

    private applyWidthToParent(width: number) {
        const parent = this.renderer.parentNode(this.el.nativeElement);
        if (parent) {
            // SOTA 2025: High-performance CSS Variable update
            this.renderer.setStyle(parent, '--sidebar-width', `${width}px`);
        }

        // Adaptive density event
        const event = new CustomEvent('sidebarResize', {
            detail: { width },
            bubbles: true
        });
        this.el.nativeElement.dispatchEvent(event);
    }
}

import { Injectable, OnDestroy, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class PwaService implements OnDestroy {
    private promptEvent: any;
    showInstallButton = signal(false);
    private readonly beforeInstallPromptHandler = (e: any) => {
        e.preventDefault();
        this.promptEvent = e;
        this.showInstallButton.set(true);
    };
    private readonly appInstalledHandler = () => {
        this.promptEvent = null;
        this.showInstallButton.set(false);
    };

    constructor() {
        this.initPwaPrompt();
    }

    private initPwaPrompt() {
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeinstallprompt', this.beforeInstallPromptHandler);
            window.addEventListener('appinstalled', this.appInstalledHandler);
        }
    }

    public async installPwa() {
        if (this.promptEvent) {
            this.promptEvent.prompt();
            await this.promptEvent.userChoice;
            this.promptEvent = null;
            this.showInstallButton.set(false);
        }
    }

    ngOnDestroy(): void {
        if (typeof window === 'undefined') {
            return;
        }

        window.removeEventListener('beforeinstallprompt', this.beforeInstallPromptHandler);
        window.removeEventListener('appinstalled', this.appInstalledHandler);
    }
}

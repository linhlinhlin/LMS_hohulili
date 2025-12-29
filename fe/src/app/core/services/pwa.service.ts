import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class PwaService {
    private promptEvent: any;
    showInstallButton = signal(false);

    constructor() {
        this.initPwaPrompt();
    }

    private initPwaPrompt() {
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeinstallprompt', (e: any) => {
                // Prevent the mini-infobar from appearing on mobile
                e.preventDefault();
                // Stash the event so it can be triggered later.
                this.promptEvent = e;
                // Update UI notify the user they can install the PWA
                this.showInstallButton.set(true);
            });

            window.addEventListener('appinstalled', () => {
                // Clear the deferred prompt so it can't be used again
                this.promptEvent = null;
                this.showInstallButton.set(false);
                console.log('PWA was installed');
            });
        }
    }

    public async installPwa() {
        if (this.promptEvent) {
            this.promptEvent.prompt();
            const { outcome } = await this.promptEvent.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            this.promptEvent = null;
            this.showInstallButton.set(false);
        }
    }
}

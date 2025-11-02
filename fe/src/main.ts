// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

// ✅ Dùng API của phiên bản lucide-angular đang có
import {
  LucideAngularModule,
  Mail,
  Ship,
  Twitter,
  Facebook,
  Linkedin,
  Instagram,
  Globe,
} from 'lucide-angular';

// Gộp providers sẵn có với Lucide icons (dùng importProvidersFrom)
const config: ApplicationConfig = {
  ...appConfig,
  providers: [
    ...(appConfig.providers ?? []),
    importProvidersFrom(
      LucideAngularModule.pick({ Mail, Ship, Twitter, Facebook, Linkedin, Instagram, Globe })
    ),
  ],
};

bootstrapApplication(App, config)
  .then(() => {
    // Register service worker for PWA functionality
    if ('serviceWorker' in navigator && environment.production) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }
  })
  .catch((err) => console.error(err));

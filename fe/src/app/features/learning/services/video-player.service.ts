import { Injectable, signal, computed, effect } from '@angular/core';

export interface VideoLesson {
  id: string;
  title: string;
  content: string; // Nội dung bài học
  description: string;
  videoUrl: string;
  pdfUrl?: string; // File PDF đính kèm
  duration: number; // in seconds
  thumbnail: string;
  courseId: string;
  order: number;
  isCompleted: boolean;
  watchedDuration: number; // in seconds
  lastWatchedAt?: Date;
  notes?: string;
  bookmarks: VideoBookmark[];
}

export interface VideoBookmark {
  id: string;
  timestamp: number; // in seconds
  title: string;
  description?: string;
  createdAt: Date;
}

export interface VideoProgress {
  lessonId: string;
  watchedDuration: number;
  totalDuration: number;
  progressPercentage: number;
  isCompleted: boolean;
  lastWatchedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class VideoPlayerService {
  // Core signals
  private _currentVideo = signal<VideoLesson | null>(null);
  private _isPlaying = signal<boolean>(false);
  private _currentTime = signal<number>(0);
  private _duration = signal<number>(0);
  private _volume = signal<number>(1);
  private _playbackRate = signal<number>(1);
  private _isFullscreen = signal<boolean>(false);
  private _isMuted = signal<boolean>(false);
  private _videoProgress = signal<VideoProgress | null>(null);
  private _notes = signal<string>('');
  private _bookmarks = signal<VideoBookmark[]>([]);

  // Readonly signals
  readonly currentVideo = this._currentVideo.asReadonly();
  readonly isPlaying = this._isPlaying.asReadonly();
  readonly currentTime = this._currentTime.asReadonly();
  readonly duration = this._duration.asReadonly();
  readonly volume = this._volume.asReadonly();
  readonly playbackRate = this._playbackRate.asReadonly();
  readonly isFullscreen = this._isFullscreen.asReadonly();
  readonly isMuted = this._isMuted.asReadonly();
  readonly videoProgress = this._videoProgress.asReadonly();
  readonly notes = this._notes.asReadonly();
  readonly bookmarks = this._bookmarks.asReadonly();

  // Computed signals
  readonly progressPercentage = computed(() => {
    const current = this._currentTime();
    const duration = this._duration();
    return duration > 0 ? (current / duration) * 100 : 0;
  });

  readonly timeFormatted = computed(() => {
    const time = this._currentTime();
    return this.formatTime(time);
  });

  readonly durationFormatted = computed(() => {
    const duration = this._duration();
    return this.formatTime(duration);
  });

  readonly remainingTime = computed(() => {
    const current = this._currentTime();
    const duration = this._duration();
    return Math.max(0, duration - current);
  });

  readonly remainingTimeFormatted = computed(() => {
    const remaining = this.remainingTime();
    return this.formatTime(remaining);
  });

  readonly isNearEnd = computed(() => {
    const progress = this.progressPercentage();
    return progress >= 90;
  });

  readonly isVideoLoaded = computed(() => {
    return this._duration() > 0;
  });

  constructor() {
    // Auto-save progress when video time changes
    effect(() => {
      const video = this._currentVideo();
      const currentTime = this._currentTime();
      const duration = this._duration();
      
      if (video && duration > 0) {
        this.updateVideoProgress(video.id, currentTime, duration);
      }
    });
  }

  /**
   * Load a video lesson
   */
  loadVideo(video: VideoLesson): void {
    this._currentVideo.set(video);
    this._currentTime.set(0);
    this._duration.set(video.duration);
    this._notes.set(video.notes || '');
    this._bookmarks.set(video.bookmarks || []);
    
    // Load saved progress
    this.loadVideoProgress(video.id);
  }

  /**
   * Play the video
   */
  play(): void {
    this._isPlaying.set(true);
  }

  /**
   * Pause the video
   */
  pause(): void {
    this._isPlaying.set(false);
  }

  /**
   * Toggle play/pause
   */
  togglePlayPause(): void {
    this._isPlaying.update(playing => !playing);
  }

  /**
   * Seek to specific time
   */
  seekTo(time: number): void {
    this._currentTime.set(Math.max(0, Math.min(time, this._duration())));
  }

  /**
   * Seek forward by seconds
   */
  seekForward(seconds: number = 10): void {
    const newTime = this._currentTime() + seconds;
    this.seekTo(newTime);
  }

  /**
   * Seek backward by seconds
   */
  seekBackward(seconds: number = 10): void {
    const newTime = this._currentTime() - seconds;
    this.seekTo(newTime);
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    this._volume.set(Math.max(0, Math.min(1, volume)));
    this._isMuted.set(volume === 0);
  }

  /**
   * Toggle mute
   */
  toggleMute(): void {
    this._isMuted.update(muted => !muted);
  }

  /**
   * Set playback rate
   */
  setPlaybackRate(rate: number): void {
    this._playbackRate.set(rate);
  }

  /**
   * Toggle fullscreen
   */
  toggleFullscreen(): void {
    this._isFullscreen.update(fullscreen => !fullscreen);
  }

  /**
   * Update current time (called by video element)
   */
  updateCurrentTime(time: number): void {
    this._currentTime.set(time);
  }

  /**
   * Update duration (called by video element)
   */
  updateDuration(duration: number): void {
    this._duration.set(duration);
  }

  /**
   * Add a bookmark
   */
  addBookmark(title: string, description?: string): void {
    const bookmark: VideoBookmark = {
      id: 'bookmark_' + Date.now(),
      timestamp: this._currentTime(),
      title,
      description,
      createdAt: new Date()
    };

    this._bookmarks.update(bookmarks => [...bookmarks, bookmark]);
    this.saveBookmarks();
  }

  /**
   * Remove a bookmark
   */
  removeBookmark(bookmarkId: string): void {
    this._bookmarks.update(bookmarks => 
      bookmarks.filter(b => b.id !== bookmarkId)
    );
    this.saveBookmarks();
  }

  /**
   * Jump to bookmark
   */
  jumpToBookmark(bookmarkId: string): void {
    const bookmark = this._bookmarks().find(b => b.id === bookmarkId);
    if (bookmark) {
      this.seekTo(bookmark.timestamp);
    }
  }

  /**
   * Update notes
   */
  updateNotes(notes: string): void {
    this._notes.set(notes);
    this.saveNotes();
  }

  /**
   * Save video progress
   */
  private updateVideoProgress(lessonId: string, watchedDuration: number, totalDuration: number): void {
    const progress: VideoProgress = {
      lessonId,
      watchedDuration,
      totalDuration,
      progressPercentage: (watchedDuration / totalDuration) * 100,
      isCompleted: watchedDuration >= totalDuration * 0.9, // 90% considered completed
      lastWatchedAt: new Date()
    };

    this._videoProgress.set(progress);
    this.saveVideoProgress(progress);
  }

  /**
   * Load video progress from storage
   */
  private loadVideoProgress(lessonId: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(`video_progress_${lessonId}`);
      if (saved) {
        try {
          const progress = JSON.parse(saved);
          this._videoProgress.set(progress);
          this._currentTime.set(progress.watchedDuration);
        } catch (error) {
          console.error('Error loading video progress:', error);
        }
      }
    }
  }

  /**
   * Save video progress to storage
   */
  private saveVideoProgress(progress: VideoProgress): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(`video_progress_${progress.lessonId}`, JSON.stringify(progress));
    }
  }

  /**
   * Save notes to storage
   */
  private saveNotes(): void {
    const video = this._currentVideo();
    if (video && typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(`video_notes_${video.id}`, this._notes());
    }
  }

  /**
   * Save bookmarks to storage
   */
  private saveBookmarks(): void {
    const video = this._currentVideo();
    if (video && typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(`video_bookmarks_${video.id}`, JSON.stringify(this._bookmarks()));
    }
  }

  /**
   * Format time in MM:SS or HH:MM:SS
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Reset video state
   */
  reset(): void {
    this._currentVideo.set(null);
    this._isPlaying.set(false);
    this._currentTime.set(0);
    this._duration.set(0);
    this._videoProgress.set(null);
    this._notes.set('');
    this._bookmarks.set([]);
  }

  /**
   * Get video statistics
   */
  getVideoStats(): {
    totalWatched: number;
    totalDuration: number;
    completionRate: number;
    bookmarksCount: number;
    hasNotes: boolean;
  } {
    const progress = this._videoProgress();
    const bookmarks = this._bookmarks();
    const notes = this._notes();

    return {
      totalWatched: progress?.watchedDuration || 0,
      totalDuration: progress?.totalDuration || 0,
      completionRate: progress?.progressPercentage || 0,
      bookmarksCount: bookmarks.length,
      hasNotes: notes.length > 0
    };
  }
}

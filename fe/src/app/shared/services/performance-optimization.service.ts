import { Injectable, signal, computed, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, debounceTime } from 'rxjs/operators';

export interface PerformanceMetrics {
  loadTime: number;
  memoryUsage: number;
  bundleSize: number;
  cacheHitRate: number;
  renderTime: number;
}

export interface BundleAnalysis {
  totalSize: number;
  gzippedSize: number;
  chunks: Array<{
    name: string;
    size: number;
    gzippedSize: number;
  }>;
}

export interface OptimizationRecommendation {
  type: 'bundle' | 'lazy-loading' | 'caching' | 'compression';
  priority: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  action: string;
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceOptimizationService {
  private router = inject(Router);
  
  // Performance metrics
  private _metrics = signal<PerformanceMetrics>({
    loadTime: 0,
    memoryUsage: 0,
    bundleSize: 0,
    cacheHitRate: 0,
    renderTime: 0
  });
  
  private _bundleAnalysis = signal<BundleAnalysis>({
    totalSize: 0,
    gzippedSize: 0,
    chunks: []
  });
  
  private _criticalIssues = signal<string[]>([]);
  private _optimizationRecommendations = signal<OptimizationRecommendation[]>([]);
  private _isOptimizing = signal(false);
  
  // Readonly signals
  readonly metrics = this._metrics.asReadonly();
  readonly bundleAnalysis = this._bundleAnalysis.asReadonly();
  readonly criticalIssues = this._criticalIssues.asReadonly();
  readonly optimizationRecommendations = this._optimizationRecommendations.asReadonly();
  readonly isOptimizing = this._isOptimizing.asReadonly();
  
  // Computed properties
  readonly performanceScore = computed(() => {
    const metrics = this._metrics();
    let score = 100;
    
    // Deduct points based on performance issues
    if (metrics.loadTime > 3000) score -= 20;
    if (metrics.memoryUsage > 50) score -= 15;
    if (metrics.bundleSize > 1000000) score -= 25;
    if (metrics.cacheHitRate < 80) score -= 10;
    if (metrics.renderTime > 100) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  });
  
  readonly needsOptimization = computed(() => {
    return this.performanceScore() < 80;
  });
  
  constructor() {
    this.initializePerformanceMonitoring();
    this.generateOptimizationRecommendations();
  }
  
  private initializePerformanceMonitoring(): void {
    // Monitor route changes for performance tracking
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        debounceTime(100)
      )
      .subscribe(() => {
        this.measurePageLoadTime();
        this.measureMemoryUsage();
        this.measureRenderTime();
      });
    
    // Initial measurements
    this.measureInitialMetrics();
  }
  
  private measureInitialMetrics(): void {
    // Measure initial page load time
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this._metrics.update(metrics => ({
          ...metrics,
          loadTime: navigation.loadEventEnd - navigation.loadEventStart
        }));
      }
    }
    
    // Measure memory usage
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      const memory = (window as any).performance.memory;
      this._metrics.update(metrics => ({
        ...metrics,
        memoryUsage: memory.usedJSHeapSize / memory.totalJSHeapSize * 100
      }));
    }
    
    // Estimate bundle size (this would be more accurate with real bundle analysis)
    this._metrics.update(metrics => ({
      ...metrics,
      bundleSize: this.estimateBundleSize()
    }));
  }
  
  private measurePageLoadTime(): void {
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this._metrics.update(metrics => ({
          ...metrics,
          loadTime: navigation.loadEventEnd - navigation.loadEventStart
        }));
      }
    }
  }
  
  private measureMemoryUsage(): void {
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      const memory = (window as any).performance.memory;
      this._metrics.update(metrics => ({
        ...metrics,
        memoryUsage: memory.usedJSHeapSize / memory.totalJSHeapSize * 100
      }));
    }
  }
  
  private measureRenderTime(): void {
    if (typeof window !== 'undefined' && window.performance) {
      const paintEntries = window.performance.getEntriesByType('paint');
      const firstPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      
      if (firstPaint) {
        this._metrics.update(metrics => ({
          ...metrics,
          renderTime: firstPaint.startTime
        }));
      }
    }
  }
  
  private estimateBundleSize(): number {
    // This is a rough estimation - in a real app, you'd use webpack-bundle-analyzer
    // or similar tools to get accurate bundle sizes
    return 600000; // 600KB estimated
  }
  
  private generateOptimizationRecommendations(): void {
    const recommendations: OptimizationRecommendation[] = [];
    const metrics = this._metrics();
    
    // Bundle size recommendations
    if (metrics.bundleSize > 500000) {
      recommendations.push({
        type: 'bundle',
        priority: 'high',
        description: 'Bundle size is large',
        impact: 'Slower initial load time',
        action: 'Consider code splitting and lazy loading'
      });
    }
    
    // Lazy loading recommendations
    if (metrics.loadTime > 2000) {
      recommendations.push({
        type: 'lazy-loading',
        priority: 'high',
        description: 'Slow page load time',
        impact: 'Poor user experience',
        action: 'Implement lazy loading for routes and components'
      });
    }
    
    // Caching recommendations
    if (metrics.cacheHitRate < 70) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        description: 'Low cache hit rate',
        impact: 'Increased server load',
        action: 'Implement proper caching strategies'
      });
    }
    
    // Compression recommendations
    if (metrics.bundleSize > 300000) {
      recommendations.push({
        type: 'compression',
        priority: 'medium',
        description: 'Large bundle size',
        impact: 'Slower downloads',
        action: 'Enable gzip compression and optimize assets'
      });
    }
    
    this._optimizationRecommendations.set(recommendations);
  }
  
  // Public methods
  updateOptimizationLevel(level: 'basic' | 'advanced' | 'aggressive'): void {
    this._isOptimizing.set(true);
    
    // Simulate optimization process
    setTimeout(() => {
      this._isOptimizing.set(false);
      
      // Update metrics based on optimization level
      const currentMetrics = this._metrics();
      let improvementFactor = 1;
      
      switch (level) {
        case 'basic':
          improvementFactor = 0.9;
          break;
        case 'advanced':
          improvementFactor = 0.8;
          break;
        case 'aggressive':
          improvementFactor = 0.7;
          break;
      }
      
      this._metrics.set({
        ...currentMetrics,
        loadTime: currentMetrics.loadTime * improvementFactor,
        bundleSize: currentMetrics.bundleSize * improvementFactor,
        renderTime: currentMetrics.renderTime * improvementFactor
      });
      
      this.generateOptimizationRecommendations();
    }, 2000);
  }
  
  formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds.toFixed(0)}ms`;
    } else {
      return `${(milliseconds / 1000).toFixed(2)}s`;
    }
  }
  
  formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  }
  
  getScoreColor(score: number): string {
    if (score >= 90) return '#10B981'; // green
    if (score >= 80) return '#3B82F6'; // blue
    if (score >= 70) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  }
  
  getScoreGrade(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Poor';
    return 'Critical';
  }
}
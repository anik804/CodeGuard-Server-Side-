import { AnalyticsService } from "./analytics.service.js";

/**
 * Analytics Cache Service
 * Caches analytics data and refreshes periodically
 */
class AnalyticsCacheService {
  constructor() {
    this.cache = {
      platformStats: null,
      examAttendance: null,
      flagsPerExam: null,
      flaggedPercentage: null,
      connectedUsers: null,
      monthlyStats: null,
      impactMetrics: null,
      institutions: null,
      lastUpdated: null,
      isUpdating: false
    };

    this.studentCache = new Map(); // Cache per studentId
    this.CACHE_TTL = 60000; // 1 minute cache TTL
    this.STUDENT_CACHE_TTL = 30000; // 30 seconds for student cache
  }

  /**
   * Get cached platform analytics or fetch if stale
   */
  async getPlatformAnalytics(forceRefresh = false) {
    const now = Date.now();
    const isStale = !this.cache.lastUpdated || 
                    (now - this.cache.lastUpdated) > this.CACHE_TTL;

    if (forceRefresh || isStale || !this.cache.platformStats) {
      if (!this.cache.isUpdating) {
        this.cache.isUpdating = true;
        try {
          console.log("🔄 Refreshing platform analytics cache...");
          
          const [
            platformStats,
            examAttendance,
            flagsPerExam,
            flaggedPercentage,
            connectedUsers,
            monthlyStats,
            impactMetrics,
            institutions
          ] = await Promise.all([
            AnalyticsService.getPlatformStats(),
            AnalyticsService.getExamAttendanceStats(),
            AnalyticsService.getFlagsPerExam(),
            AnalyticsService.getFlaggedStudentsPercentage(),
            AnalyticsService.getConnectedUsersCount(),
            AnalyticsService.getMonthlyStats(),
            AnalyticsService.getImpactMetrics(),
            AnalyticsService.getInstitutionsCount()
          ]);

          this.cache = {
            platformStats,
            examAttendance,
            flagsPerExam,
            flaggedPercentage,
            connectedUsers,
            monthlyStats,
            impactMetrics,
            institutions,
            lastUpdated: now,
            isUpdating: false
          };

          console.log("✅ Platform analytics cache refreshed");
        } catch (error) {
          console.error("❌ Error refreshing analytics cache:", error);
          this.cache.isUpdating = false;
          throw error;
        }
      }
    }

    return {
      platformStats: this.cache.platformStats,
      examAttendance: this.cache.examAttendance,
      flagsPerExam: this.cache.flagsPerExam,
      flaggedPercentage: this.cache.flaggedPercentage,
      connectedUsers: this.cache.connectedUsers,
      monthlyStats: this.cache.monthlyStats,
      impactMetrics: this.cache.impactMetrics,
      institutions: this.cache.institutions
    };
  }

  /**
   * Get cached student analytics or fetch if stale
   */
  async getStudentAnalytics(studentId, forceRefresh = false) {
    if (!studentId) {
      throw new Error("Student ID is required");
    }

    const cached = this.studentCache.get(studentId);
    const now = Date.now();
    const isStale = !cached || 
                    (now - cached.lastUpdated) > this.STUDENT_CACHE_TTL;

    if (forceRefresh || isStale || !cached) {
      try {
        console.log(`🔄 Refreshing student analytics cache for ${studentId}...`);
        
        const studentAnalytics = await AnalyticsService.getStudentAnalytics(studentId);
        
        this.studentCache.set(studentId, {
          ...studentAnalytics,
          lastUpdated: now
        });

        console.log(`✅ Student analytics cache refreshed for ${studentId}`);
      } catch (error) {
        console.error(`❌ Error refreshing student analytics cache for ${studentId}:`, error);
        // Return cached data if available, even if stale
        if (cached) {
          return cached;
        }
        throw error;
      }
    }

    return this.studentCache.get(studentId);
  }

  /**
   * Invalidate cache (force refresh on next request)
   */
  invalidateCache() {
    this.cache.lastUpdated = null;
    this.studentCache.clear();
    console.log("🗑️ Analytics cache invalidated");
  }

  /**
   * Invalidate student cache
   */
  invalidateStudentCache(studentId) {
    if (studentId) {
      this.studentCache.delete(studentId);
      console.log(`🗑️ Student analytics cache invalidated for ${studentId}`);
    } else {
      this.studentCache.clear();
      console.log("🗑️ All student analytics cache invalidated");
    }
  }

  /**
   * Preload analytics on server startup
   */
  async preloadAnalytics() {
    try {
      console.log("🚀 Preloading analytics cache...");
      await this.getPlatformAnalytics(true);
      console.log("✅ Analytics preloaded successfully");
    } catch (error) {
      console.error("❌ Error preloading analytics:", error);
    }
  }

  /**
   * Start background refresh interval
   */
  startBackgroundRefresh(intervalMs = 60000) {
    setInterval(async () => {
      try {
        await this.getPlatformAnalytics(true);
      } catch (error) {
        console.error("❌ Error in background analytics refresh:", error);
      }
    }, intervalMs);
    
    console.log(`🔄 Background analytics refresh started (every ${intervalMs}ms)`);
  }
}

// Export singleton instance
export const analyticsCache = new AnalyticsCacheService();


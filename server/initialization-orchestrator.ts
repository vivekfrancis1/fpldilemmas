/**
 * InitializationOrchestrator - Eliminates race conditions through explicit dependency management
 * 
 * Replaces parallel cache initialization with a dependency-aware system that ensures
 * prerequisite data is fully persisted before dependent operations begin.
 */

export interface JobDefinition {
  id: string;
  name: string;
  dependencies: string[];
  executor: () => Promise<void>;
  timeout?: number;
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  error?: string;
}

export class InitializationOrchestrator {
  private jobs = new Map<string, JobDefinition>();
  private jobStatus = new Map<string, JobStatus>();
  private readonly DEFAULT_TIMEOUT = 60000; // 1 minute per job

  constructor() {
    console.log("🔧 InitializationOrchestrator created - dependency-aware cache initialization enabled");
  }

  /**
   * Register a job with its dependencies
   */
  registerJob(job: JobDefinition): void {
    this.jobs.set(job.id, job);
    this.jobStatus.set(job.id, {
      id: job.id,
      status: 'pending'
    });
  }

  /**
   * Execute all registered jobs respecting dependency order
   */
  async executeAll(): Promise<void> {
    console.log("🚀 Starting dependency-aware initialization...");
    const startTime = Date.now();

    // Build dependency graph and validate
    this.validateDependencies();
    
    // Execute jobs in dependency order
    const completed = new Set<string>();
    const inProgress = new Set<string>();

    while (completed.size < this.jobs.size) {
      const readyJobs = this.findReadyJobs(completed, inProgress);
      
      if (readyJobs.length === 0) {
        const remaining = Array.from(this.jobs.keys()).filter(id => !completed.has(id));
        throw new Error(`Deadlock detected: no jobs can proceed. Remaining: ${remaining.join(', ')}`);
      }

      // Execute ready jobs in parallel (they have no dependencies between them)
      const jobPromises = readyJobs.map(job => this.executeJob(job, completed, inProgress));
      await Promise.all(jobPromises);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Dependency-aware initialization completed in ${duration}ms`);
  }

  /**
   * Check if a specific job is ready (all dependencies completed)
   */
  isJobReady(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    return job.dependencies.every(depId => 
      this.jobStatus.get(depId)?.status === 'completed'
    );
  }

  /**
   * Get status of all jobs
   */
  getStatus(): JobStatus[] {
    return Array.from(this.jobStatus.values());
  }

  /**
   * Check if entire system is ready
   */
  isSystemReady(requiredJobs?: string[]): { ready: boolean; missing: string[] } {
    const jobsToCheck = requiredJobs || Array.from(this.jobs.keys());
    const missing = jobsToCheck.filter(jobId => 
      this.jobStatus.get(jobId)?.status !== 'completed'
    );

    return {
      ready: missing.length === 0,
      missing
    };
  }

  private validateDependencies(): void {
    // Check for circular dependencies using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const jobId of Array.from(this.jobs.keys())) {
      if (this.hasCycle(jobId, visited, recursionStack)) {
        throw new Error(`Circular dependency detected involving job: ${jobId}`);
      }
    }

    // Check for missing dependencies
    for (const [jobId, job] of Array.from(this.jobs.entries())) {
      for (const depId of job.dependencies) {
        if (!this.jobs.has(depId)) {
          throw new Error(`Job '${jobId}' depends on non-existent job '${depId}'`);
        }
      }
    }
  }

  private hasCycle(jobId: string, visited: Set<string>, recursionStack: Set<string>): boolean {
    if (recursionStack.has(jobId)) return true;
    if (visited.has(jobId)) return false;

    visited.add(jobId);
    recursionStack.add(jobId);

    const job = this.jobs.get(jobId);
    if (job) {
      for (const depId of job.dependencies) {
        if (this.hasCycle(depId, visited, recursionStack)) {
          return true;
        }
      }
    }

    recursionStack.delete(jobId);
    return false;
  }

  private findReadyJobs(completed: Set<string>, inProgress: Set<string>): JobDefinition[] {
    const ready: JobDefinition[] = [];

    for (const [jobId, job] of Array.from(this.jobs.entries())) {
      if (completed.has(jobId) || inProgress.has(jobId)) continue;
      
      // Check if all dependencies are completed
      const dependenciesMet = job.dependencies.every((depId: string) => completed.has(depId));
      
      if (dependenciesMet) {
        ready.push(job);
      }
    }

    return ready;
  }

  private async executeJob(
    job: JobDefinition, 
    completed: Set<string>, 
    inProgress: Set<string>
  ): Promise<void> {
    const jobId = job.id;
    inProgress.add(jobId);
    
    // Update status
    const status = this.jobStatus.get(jobId)!;
    status.status = 'running';
    status.startTime = Date.now();

    console.log(`🔄 Starting job: ${job.name} (${jobId})`);

    try {
      // Set timeout protection
      const timeout = job.timeout || this.DEFAULT_TIMEOUT;
      const jobPromise = job.executor();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Job '${jobId}' timed out after ${timeout}ms`)), timeout);
      });

      await Promise.race([jobPromise, timeoutPromise]);

      // Mark as completed
      status.status = 'completed';
      status.endTime = Date.now();
      const duration = status.endTime - (status.startTime || 0);
      
      completed.add(jobId);
      inProgress.delete(jobId);
      
      console.log(`✅ Completed job: ${job.name} (${duration}ms)`);

    } catch (error) {
      // Mark as failed
      status.status = 'failed';
      status.endTime = Date.now();
      status.error = error instanceof Error ? error.message : String(error);
      
      inProgress.delete(jobId);
      
      console.error(`❌ Failed job: ${job.name} - ${status.error}`);
      throw error;
    }
  }
}
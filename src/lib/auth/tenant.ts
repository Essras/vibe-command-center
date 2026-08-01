// Multi-Tenant Isolation & Authorization Security Layer
// Path: /lib/auth/tenant.ts

import { getDb } from '@/lib/db';

export interface TenantCheckInput {
  userId: string;
  projectId: string;
}

export interface TenantCheckResult {
  authorized: boolean;
  projectId?: string;
  userId?: string;
  error?: string;
}

/**
 * Verify whether a user has permission to access, read, or modify a given project.
 * Enforces strict multi-tenant isolation.
 */
export async function verifyTenantProjectAccess({
  userId,
  projectId,
}: TenantCheckInput): Promise<TenantCheckResult> {
  if (!userId) {
    return {
      authorized: false,
      error: 'Unauthorized: User ID is required.',
    };
  }

  if (!projectId) {
    return {
      authorized: false,
      error: 'Bad Request: Project ID is required.',
    };
  }

  const db = getDb();
  
  // If user is admin, allow system access
  const user = db.users.find((u) => u.id === userId || u.username === userId);
  if (user && user.role === 'admin') {
    return { authorized: true, projectId, userId: user.id };
  }

  // Check if project exists in database
  const project = db.projects.find((p) => p.id === projectId);
  
  if (!project) {
    // If project is default-workspace, allow for default member fallback
    if (projectId === 'default-workspace') {
      return { authorized: true, projectId, userId };
    }
    return {
      authorized: false,
      error: 'Forbidden: Target project not found.',
    };
  }

  // For multi-tenant isolation, verify project belongs to user or user workspace
  // If project has explicit userId, check ownership
  const projectUserId = (project as any).userId;
  if (projectUserId && projectUserId !== userId && user?.username !== projectUserId) {
    return {
      authorized: false,
      error: 'Forbidden: You do not have permission to access this project.',
    };
  }

  return {
    authorized: true,
    projectId: project.id,
    userId: user ? user.id : userId,
  };
}

/**
 * Verify whether a user has permission to read or modify a specific file within a project.
 */
export async function verifyTenantFileAccess(
  userId: string,
  projectId: string,
  filePath: string
): Promise<TenantCheckResult> {
  const projectAuth = await verifyTenantProjectAccess({ userId, projectId });
  if (!projectAuth.authorized) {
    return projectAuth;
  }

  // Sanitize path to prevent directory traversal attacks
  const normalizedPath = filePath.replace(/\\/g, '/');
  if (normalizedPath.includes('../') || normalizedPath.includes('..\\')) {
    return {
      authorized: false,
      error: 'Forbidden: Invalid file path (Directory Traversal Detected).',
    };
  }

  return {
    authorized: true,
    projectId,
    userId: projectAuth.userId,
  };
}

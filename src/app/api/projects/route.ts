import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, clients, contracts, user } from '@/db/schema';
import { eq, like, and, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

// GET - List projects with filters or get single project by ID
export async function GET(request: NextRequest) {
  try {
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clientId = searchParams.get('client_id');
    const status = searchParams.get('status');
    const projectManager = searchParams.get('project_manager');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Get single project by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const project = await db.select()
        .from(projects)
        .where(eq(projects.id, parseInt(id)))
        .limit(1);

      if (project.length === 0) {
        return NextResponse.json({ 
          error: 'Project not found',
          code: "PROJECT_NOT_FOUND" 
        }, { status: 404 });
      }

      return NextResponse.json(project[0], { status: 200 });
    }

    // Build query with filters
    let query = db.select().from(projects);
    const conditions = [];

    if (clientId) {
      conditions.push(eq(projects.clientId, parseInt(clientId)));
    }

    if (status) {
      conditions.push(eq(projects.status, status));
    }

    if (projectManager) {
      conditions.push(eq(projects.projectManager, parseInt(projectManager)));
    }

    if (search) {
      conditions.push(like(projects.name, `%${search}%`));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(projects.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

// POST - Create new project
export async function POST(request: NextRequest) {
  try {
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { 
      name, 
      description, 
      clientId, 
      contractId, 
      status, 
      startDate, 
      endDate, 
      budget, 
      spent,
      projectManager 
    } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ 
        error: "Name is required",
        code: "MISSING_NAME" 
      }, { status: 400 });
    }

    if (!clientId) {
      return NextResponse.json({ 
        error: "Client ID is required",
        code: "MISSING_CLIENT_ID" 
      }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ 
        error: "Status is required",
        code: "MISSING_STATUS" 
      }, { status: 400 });
    }

    // Validate status enum
    const validStatuses = ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: `Status must be one of: ${validStatuses.join(', ')}`,
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    // Validate client exists
    const clientExists = await db.select()
      .from(clients)
      .where(eq(clients.id, parseInt(clientId)))
      .limit(1);

    if (clientExists.length === 0) {
      return NextResponse.json({ 
        error: "Client not found",
        code: "CLIENT_NOT_FOUND" 
      }, { status: 400 });
    }

    // Validate contract if provided
    if (contractId) {
      const contractExists = await db.select()
        .from(contracts)
        .where(eq(contracts.id, parseInt(contractId)))
        .limit(1);

      if (contractExists.length === 0) {
        return NextResponse.json({ 
          error: "Contract not found",
          code: "CONTRACT_NOT_FOUND" 
        }, { status: 400 });
      }
    }

    // Validate project manager if provided
    if (projectManager) {
      const managerExists = await db.select()
        .from(user)
        .where(eq(user.id, projectManager.toString()))
        .limit(1);

      if (managerExists.length === 0) {
        return NextResponse.json({ 
          error: "Project manager not found",
          code: "MANAGER_NOT_FOUND" 
        }, { status: 400 });
      }
    }

    // Validate budget is non-negative if provided
    if (budget !== undefined && budget !== null && budget < 0) {
      return NextResponse.json({ 
        error: "Budget must be non-negative",
        code: "INVALID_BUDGET" 
      }, { status: 400 });
    }

    // Validate spent is non-negative if provided
    if (spent !== undefined && spent !== null && spent < 0) {
      return NextResponse.json({ 
        error: "Spent amount must be non-negative",
        code: "INVALID_SPENT" 
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    const newProject = await db.insert(projects)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
        clientId: parseInt(clientId),
        contractId: contractId ? parseInt(contractId) : null,
        status,
        startDate: startDate || null,
        endDate: endDate || null,
        budget: budget !== undefined && budget !== null ? parseInt(budget.toString()) : null,
        spent: spent !== undefined && spent !== null ? parseInt(spent.toString()) : 0,
        projectManager: projectManager ? parseInt(projectManager) : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(newProject[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

// PUT - Update project by ID
export async function PUT(request: NextRequest) {
  try {
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const body = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Check if project exists
    const existingProject = await db.select()
      .from(projects)
      .where(eq(projects.id, parseInt(id)))
      .limit(1);

    if (existingProject.length === 0) {
      return NextResponse.json({ 
        error: 'Project not found',
        code: "PROJECT_NOT_FOUND" 
      }, { status: 404 });
    }

    const { 
      name, 
      description, 
      clientId, 
      contractId, 
      status, 
      startDate, 
      endDate, 
      budget, 
      spent,
      projectManager 
    } = body;

    // Validate status if provided
    if (status) {
      const validStatuses = ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ 
          error: `Status must be one of: ${validStatuses.join(', ')}`,
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
    }

    // Validate client if provided
    if (clientId) {
      const clientExists = await db.select()
        .from(clients)
        .where(eq(clients.id, parseInt(clientId)))
        .limit(1);

      if (clientExists.length === 0) {
        return NextResponse.json({ 
          error: "Client not found",
          code: "CLIENT_NOT_FOUND" 
        }, { status: 400 });
      }
    }

    // Validate contract if provided
    if (contractId !== undefined) {
      if (contractId !== null) {
        const contractExists = await db.select()
          .from(contracts)
          .where(eq(contracts.id, parseInt(contractId)))
          .limit(1);

        if (contractExists.length === 0) {
          return NextResponse.json({ 
            error: "Contract not found",
            code: "CONTRACT_NOT_FOUND" 
          }, { status: 400 });
        }
      }
    }

    // Validate project manager if provided
    if (projectManager !== undefined) {
      if (projectManager !== null) {
        const managerExists = await db.select()
          .from(user)
          .where(eq(user.id, projectManager.toString()))
          .limit(1);

        if (managerExists.length === 0) {
          return NextResponse.json({ 
            error: "Project manager not found",
            code: "MANAGER_NOT_FOUND" 
          }, { status: 400 });
        }
      }
    }

    // Validate budget is non-negative if provided
    if (budget !== undefined && budget !== null && budget < 0) {
      return NextResponse.json({ 
        error: "Budget must be non-negative",
        code: "INVALID_BUDGET" 
      }, { status: 400 });
    }

    // Validate spent is non-negative if provided
    if (spent !== undefined && spent !== null && spent < 0) {
      return NextResponse.json({ 
        error: "Spent amount must be non-negative",
        code: "INVALID_SPENT" 
      }, { status: 400 });
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (clientId !== undefined) updateData.clientId = parseInt(clientId);
    if (contractId !== undefined) updateData.contractId = contractId ? parseInt(contractId) : null;
    if (status !== undefined) updateData.status = status;
    if (startDate !== undefined) updateData.startDate = startDate || null;
    if (endDate !== undefined) updateData.endDate = endDate || null;
    if (budget !== undefined) updateData.budget = budget !== null ? parseInt(budget.toString()) : null;
    if (spent !== undefined) updateData.spent = parseInt(spent.toString());
    if (projectManager !== undefined) updateData.projectManager = projectManager ? parseInt(projectManager) : null;

    const updatedProject = await db.update(projects)
      .set(updateData)
      .where(eq(projects.id, parseInt(id)))
      .returning();

    return NextResponse.json(updatedProject[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

// DELETE - Delete project by ID
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if project exists
    const existingProject = await db.select()
      .from(projects)
      .where(eq(projects.id, parseInt(id)))
      .limit(1);

    if (existingProject.length === 0) {
      return NextResponse.json({ 
        error: 'Project not found',
        code: "PROJECT_NOT_FOUND" 
      }, { status: 404 });
    }

    const deletedProject = await db.delete(projects)
      .where(eq(projects.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Project deleted successfully',
      project: deletedProject[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}
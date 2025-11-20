import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { employees } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';

// Email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// POST - Create new employee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, department, photo_url } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { 
          error: 'Name is required and must be a non-empty string',
          code: 'MISSING_NAME' 
        },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json(
        { 
          error: 'Email is required and must be a non-empty string',
          code: 'MISSING_EMAIL' 
        },
        { status: 400 }
      );
    }

    // Validate email format
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { 
          error: 'Invalid email format',
          code: 'INVALID_EMAIL_FORMAT' 
        },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmployee = await db.select()
      .from(employees)
      .where(eq(employees.email, normalizedEmail))
      .limit(1);

    if (existingEmployee.length > 0) {
      return NextResponse.json(
        { 
          error: 'Email already exists',
          code: 'DUPLICATE_EMAIL' 
        },
        { status: 409 }
      );
    }

    // Prepare insert data
    const insertData: any = {
      name: name.trim(),
      email: normalizedEmail,
      createdAt: new Date().toISOString(),
    };

    // Add optional fields if provided
    if (department && typeof department === 'string' && department.trim() !== '') {
      insertData.department = department.trim();
    }

    if (photo_url && typeof photo_url === 'string' && photo_url.trim() !== '') {
      insertData.photoUrl = photo_url.trim();
    }

    // Insert new employee
    const newEmployee = await db.insert(employees)
      .values(insertData)
      .returning();

    return NextResponse.json(newEmployee[0], { status: 201 });

  } catch (error: any) {
    console.error('POST error:', error);
    
    // Handle unique constraint violation
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { 
          error: 'Email already exists',
          code: 'DUPLICATE_EMAIL' 
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error: ' + error.message 
      },
      { status: 500 }
    );
  }
}

// GET - List employees or get single employee by id
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Get single employee by ID
    if (id) {
      // Validate ID
      const parsedId = parseInt(id);
      if (isNaN(parsedId)) {
        return NextResponse.json(
          { 
            error: 'Valid ID is required',
            code: 'INVALID_ID' 
          },
          { status: 400 }
        );
      }

      const employee = await db.select()
        .from(employees)
        .where(eq(employees.id, parsedId))
        .limit(1);

      if (employee.length === 0) {
        return NextResponse.json(
          { 
            error: 'Employee not found',
            code: 'NOT_FOUND' 
          },
          { status: 404 }
        );
      }

      return NextResponse.json(employee[0], { status: 200 });
    }

    // List employees with search and filters
    const search = searchParams.get('search');
    const department = searchParams.get('department');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    let query = db.select().from(employees);

    // Build where conditions
    const conditions = [];

    // Search filter (name or email)
    if (search && search.trim() !== '') {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      conditions.push(
        or(
          like(employees.name, searchTerm),
          like(employees.email, searchTerm)
        )
      );
    }

    // Department filter
    if (department && department.trim() !== '') {
      conditions.push(eq(employees.department, department.trim()));
    }

    // Apply conditions if any exist
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply pagination and ordering
    const results = await query
      .orderBy(desc(employees.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error: any) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + error.message 
      },
      { status: 500 }
    );
  }
}
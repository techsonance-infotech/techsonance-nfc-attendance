import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { employees } from '@/db/schema';
import { eq, like, and, or, asc } from 'drizzle-orm';
import { getCurrentUser, auth } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valid status values
const VALID_STATUSES = ['active', 'inactive', 'suspended'];

// Helper function to validate email format
function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

// Helper function to check role permissions
function hasPermission(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole);
}

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Authorization check - all authenticated users can view
    if (!hasPermission(user.role || '', ['admin', 'hr', 'reader', 'employee'])) {
      return NextResponse.json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const search = searchParams.get('search');
    const department = searchParams.get('department');
    const status = searchParams.get('status');

    // Build query conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(employees.name, `%${search}%`),
          like(employees.email, `%${search}%`)
        )
      );
    }

    if (department) {
      conditions.push(eq(employees.department, department));
    }

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS'
        }, { status: 400 });
      }
      conditions.push(eq(employees.status, status));
    }

    // Execute query with conditions
    let query = db.select().from(employees);

    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }

    const results = await query
      .orderBy(asc(employees.name))
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

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Authorization check - only admin and hr can create
    if (!hasPermission(user.role || '', ['admin', 'hr'])) {
      return NextResponse.json({
        error: 'Insufficient permissions. Only admin or hr roles can create employees.',
        code: 'FORBIDDEN'
      }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      email,
      department,
      nfcCardId,
      photoUrl,
      salary,
      hourlyRate,
      enrollmentDate
    } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({
        error: 'Name is required',
        code: 'MISSING_NAME'
      }, { status: 400 });
    }

    if (!email || !email.trim()) {
      return NextResponse.json({
        error: 'Email is required',
        code: 'MISSING_EMAIL'
      }, { status: 400 });
    }

    if (!department || !department.trim()) {
      return NextResponse.json({
        error: 'Department is required',
        code: 'MISSING_DEPARTMENT'
      }, { status: 400 });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json({
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      }, { status: 400 });
    }

    // Validate salary if provided
    if (salary !== undefined && salary !== null) {
      const salaryNum = parseFloat(salary);
      if (isNaN(salaryNum) || salaryNum < 0) {
        return NextResponse.json({
          error: 'Salary must be a positive number',
          code: 'INVALID_SALARY'
        }, { status: 400 });
      }
    }

    // Validate hourlyRate if provided
    if (hourlyRate !== undefined && hourlyRate !== null) {
      const rateNum = parseFloat(hourlyRate);
      if (isNaN(rateNum) || rateNum < 0) {
        return NextResponse.json({
          error: 'Hourly rate must be a positive number',
          code: 'INVALID_HOURLY_RATE'
        }, { status: 400 });
      }
    }

    // Check email uniqueness
    const existingEmail = await db.select()
      .from(employees)
      .where(eq(employees.email, email.toLowerCase().trim()))
      .limit(1);

    if (existingEmail.length > 0) {
      return NextResponse.json({
        error: 'Email already exists',
        code: 'DUPLICATE_EMAIL'
      }, { status: 400 });
    }

    // Check nfcCardId uniqueness if provided
    if (nfcCardId && nfcCardId.trim()) {
      const existingNfc = await db.select()
        .from(employees)
        .where(eq(employees.nfcCardId, nfcCardId.trim()))
        .limit(1);

      if (existingNfc.length > 0) {
        return NextResponse.json({
          error: 'NFC Card ID already exists',
          code: 'DUPLICATE_NFC_CARD'
        }, { status: 400 });
      }
    }

    // Prepare insert data
    const insertData: any = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      department: department.trim(),
      status: 'active',
      createdAt: new Date().toISOString()
    };

    if (nfcCardId && nfcCardId.trim()) {
      insertData.nfcCardId = nfcCardId.trim();
    }

    if (photoUrl && photoUrl.trim()) {
      insertData.photoUrl = photoUrl.trim();
    }

    if (salary !== undefined && salary !== null) {
      insertData.salary = parseFloat(salary);
    }

    if (hourlyRate !== undefined && hourlyRate !== null) {
      insertData.hourlyRate = parseFloat(hourlyRate);
    }

    if (enrollmentDate && enrollmentDate.trim()) {
      insertData.enrollmentDate = enrollmentDate.trim();
    }

    // Insert employee first to get the ID (needed for password)
    let newEmployee;
    try {
      const inserted = await db.insert(employees)
        .values(insertData)
        .returning();
      newEmployee = inserted[0];
    } catch (dbError) {
      console.error('Database insert error:', dbError);
      return NextResponse.json({
        error: 'Failed to create employee record',
        code: 'DB_INSERT_ERROR'
      }, { status: 500 });
    }

    // Generate password: TechSonance + ID
    const generatedPassword = `TechSonance${newEmployee.id}`;

    // Create user account via Better Auth
    try {
      const signUpRes = await auth.api.signUpEmail({
        body: {
          email: insertData.email,
          password: generatedPassword,
          name: insertData.name,
          role: 'employee' // Explicitly set role
        },
        asResponse: false
      });

      if (!signUpRes?.user) {
        throw new Error("Failed to create user account");
      }

      // Send welcome email (fire and forget or await?)
      // We await to log success/failure but don't fail request if email fails
      await sendWelcomeEmail({
        email: insertData.email,
        name: insertData.name,
        password: generatedPassword,
        designation: insertData.department
      });

      return NextResponse.json(newEmployee, { status: 201 });

    } catch (authError: any) {
      console.error('Auth/Email error:', authError);

      // COMPENSATION: Delete the created employee since user account failed
      await db.delete(employees).where(eq(employees.id, newEmployee.id));

      if (authError?.body?.message === "User already exists" || authError?.message?.includes("already exists")) {
        return NextResponse.json({
          error: 'User account with this email already exists',
          code: 'DUPLICATE_USER'
        }, { status: 400 });
      }

      return NextResponse.json({
        error: 'Failed to create user account: ' + (authError.message || 'Unknown error'),
        code: 'AUTH_CREATE_ERROR'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Authorization check - only admin and hr can update
    if (!hasPermission(user.role || '', ['admin', 'hr'])) {
      return NextResponse.json({
        error: 'Insufficient permissions. Only admin or hr roles can update employees.',
        code: 'FORBIDDEN'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        error: 'Valid ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const employeeId = parseInt(id);

    // Check if employee exists
    const existing = await db.select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({
        error: 'Employee not found',
        code: 'NOT_FOUND'
      }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      email,
      department,
      nfcCardId,
      photoUrl,
      salary,
      hourlyRate,
      status,
      enrollmentDate
    } = body;

    const updates: any = {};

    // Validate and add name if provided
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return NextResponse.json({
          error: 'Name cannot be empty',
          code: 'INVALID_NAME'
        }, { status: 400 });
      }
      updates.name = name.trim();
    }

    // Validate and add email if provided
    if (email !== undefined) {
      if (!email || !email.trim()) {
        return NextResponse.json({
          error: 'Email cannot be empty',
          code: 'INVALID_EMAIL'
        }, { status: 400 });
      }

      const normalizedEmail = email.toLowerCase().trim();

      if (!isValidEmail(normalizedEmail)) {
        return NextResponse.json({
          error: 'Invalid email format',
          code: 'INVALID_EMAIL'
        }, { status: 400 });
      }

      // Check email uniqueness (excluding current employee)
      const existingEmail = await db.select()
        .from(employees)
        .where(eq(employees.email, normalizedEmail))
        .limit(1);

      if (existingEmail.length > 0 && existingEmail[0].id !== employeeId) {
        return NextResponse.json({
          error: 'Email already exists',
          code: 'DUPLICATE_EMAIL'
        }, { status: 400 });
      }

      updates.email = normalizedEmail;
    }

    // Validate and add department if provided
    if (department !== undefined) {
      if (!department || !department.trim()) {
        return NextResponse.json({
          error: 'Department cannot be empty',
          code: 'INVALID_DEPARTMENT'
        }, { status: 400 });
      }
      updates.department = department.trim();
    }

    // Validate and add nfcCardId if provided
    if (nfcCardId !== undefined) {
      if (nfcCardId && nfcCardId.trim()) {
        // Check nfcCardId uniqueness (excluding current employee)
        const existingNfc = await db.select()
          .from(employees)
          .where(eq(employees.nfcCardId, nfcCardId.trim()))
          .limit(1);

        if (existingNfc.length > 0 && existingNfc[0].id !== employeeId) {
          return NextResponse.json({
            error: 'NFC Card ID already exists',
            code: 'DUPLICATE_NFC_CARD'
          }, { status: 400 });
        }

        updates.nfcCardId = nfcCardId.trim();
      } else {
        updates.nfcCardId = null;
      }
    }

    // Add photoUrl if provided
    if (photoUrl !== undefined) {
      updates.photoUrl = photoUrl && photoUrl.trim() ? photoUrl.trim() : null;
    }

    // Validate and add salary if provided
    if (salary !== undefined) {
      if (salary !== null) {
        const salaryNum = parseFloat(salary);
        if (isNaN(salaryNum) || salaryNum < 0) {
          return NextResponse.json({
            error: 'Salary must be a positive number',
            code: 'INVALID_SALARY'
          }, { status: 400 });
        }
        updates.salary = salaryNum;
      } else {
        updates.salary = null;
      }
    }

    // Validate and add hourlyRate if provided
    if (hourlyRate !== undefined) {
      if (hourlyRate !== null) {
        const rateNum = parseFloat(hourlyRate);
        if (isNaN(rateNum) || rateNum < 0) {
          return NextResponse.json({
            error: 'Hourly rate must be a positive number',
            code: 'INVALID_HOURLY_RATE'
          }, { status: 400 });
        }
        updates.hourlyRate = rateNum;
      } else {
        updates.hourlyRate = null;
      }
    }

    // Validate and add status if provided
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS'
        }, { status: 400 });
      }
      updates.status = status;
    }

    // Add enrollmentDate if provided
    if (enrollmentDate !== undefined) {
      updates.enrollmentDate = enrollmentDate && enrollmentDate.trim() ? enrollmentDate.trim() : null;
    }

    // Check if there are any updates
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        error: 'No fields to update',
        code: 'NO_UPDATES'
      }, { status: 400 });
    }

    // Update employee
    const updated = await db.update(employees)
      .set(updates)
      .where(eq(employees.id, employeeId))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Authorization check - only admin can delete (soft delete)
    if (!hasPermission(user.role || '', ['admin'])) {
      return NextResponse.json({
        error: 'Insufficient permissions. Only admin role can delete employees.',
        code: 'FORBIDDEN'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        error: 'Valid ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const employeeId = parseInt(id);

    // Check if employee exists
    const existing = await db.select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({
        error: 'Employee not found',
        code: 'NOT_FOUND'
      }, { status: 404 });
    }

    // Soft delete by setting status to inactive
    const deleted = await db.update(employees)
      .set({ status: 'inactive' })
      .where(eq(employees.id, employeeId))
      .returning();

    return NextResponse.json({
      message: 'Employee deleted successfully (soft delete)',
      employee: deleted[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { employees } from '@/db/schema';
import { eq, and, ne, or } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const id = params.id;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid employee ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const employee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, parseInt(id)))
      .limit(1);

    if (employee.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(employee[0], { status: 200 });
  } catch (error) {
    console.error('GET employee error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin' && user.role !== 'hr') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin or HR role required.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const id = params.id;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid employee ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const employeeId = parseInt(id);

    const existingEmployee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (existingEmployee.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      email,
      department,
      photoUrl,
      salary,
      hourlyRate,
      status,
      enrollmentDate,
      nfcCardId,
    } = body;

    const updates: any = {};

    if (name !== undefined) {
      if (!name || name.trim() === '') {
        return NextResponse.json(
          { error: 'Name cannot be empty', code: 'INVALID_NAME' },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }

    if (email !== undefined) {
      if (!email || email.trim() === '') {
        return NextResponse.json(
          { error: 'Email cannot be empty', code: 'INVALID_EMAIL' },
          { status: 400 }
        );
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format', code: 'INVALID_EMAIL_FORMAT' },
          { status: 400 }
        );
      }

      const normalizedEmail = email.toLowerCase().trim();

      const emailExists = await db
        .select()
        .from(employees)
        .where(
          and(
            eq(employees.email, normalizedEmail),
            ne(employees.id, employeeId)
          )
        )
        .limit(1);

      if (emailExists.length > 0) {
        return NextResponse.json(
          { error: 'Email already exists', code: 'EMAIL_EXISTS' },
          { status: 400 }
        );
      }

      updates.email = normalizedEmail;
    }

    if (nfcCardId !== undefined) {
      if (nfcCardId && nfcCardId.trim() !== '') {
        const trimmedNfcCardId = nfcCardId.trim();

        const nfcCardExists = await db
          .select()
          .from(employees)
          .where(
            and(
              eq(employees.nfcCardId, trimmedNfcCardId),
              ne(employees.id, employeeId)
            )
          )
          .limit(1);

        if (nfcCardExists.length > 0) {
          return NextResponse.json(
            { error: 'NFC Card ID already exists', code: 'NFC_CARD_EXISTS' },
            { status: 400 }
          );
        }

        updates.nfcCardId = trimmedNfcCardId;
      } else {
        updates.nfcCardId = null;
      }
    }

    if (department !== undefined) {
      updates.department = department ? department.trim() : null;
    }

    if (photoUrl !== undefined) {
      updates.photoUrl = photoUrl ? photoUrl.trim() : null;
    }

    if (salary !== undefined) {
      if (salary !== null && (isNaN(parseFloat(salary)) || parseFloat(salary) < 0)) {
        return NextResponse.json(
          { error: 'Invalid salary value', code: 'INVALID_SALARY' },
          { status: 400 }
        );
      }
      updates.salary = salary !== null ? parseFloat(salary) : null;
    }

    if (hourlyRate !== undefined) {
      if (hourlyRate !== null && (isNaN(parseFloat(hourlyRate)) || parseFloat(hourlyRate) < 0)) {
        return NextResponse.json(
          { error: 'Invalid hourly rate value', code: 'INVALID_HOURLY_RATE' },
          { status: 400 }
        );
      }
      updates.hourlyRate = hourlyRate !== null ? parseFloat(hourlyRate) : null;
    }

    if (status !== undefined) {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status value. Must be: active, inactive, or suspended', code: 'INVALID_STATUS' },
          { status: 400 }
        );
      }
      updates.status = status;
    }

    if (enrollmentDate !== undefined) {
      updates.enrollmentDate = enrollmentDate ? enrollmentDate.trim() : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(existingEmployee[0], { status: 200 });
    }

    const updatedEmployee = await db
      .update(employees)
      .set(updates)
      .where(eq(employees.id, employeeId))
      .returning();

    return NextResponse.json(updatedEmployee[0], { status: 200 });
  } catch (error) {
    console.error('PUT employee error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin role required.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const id = params.id;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid employee ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const employeeId = parseInt(id);

    const existingEmployee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (existingEmployee.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const deletedEmployee = await db
      .update(employees)
      .set({ status: 'inactive' })
      .where(eq(employees.id, employeeId))
      .returning();

    return NextResponse.json(
      {
        message: 'Employee successfully deactivated',
        employee: deletedEmployee[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE employee error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
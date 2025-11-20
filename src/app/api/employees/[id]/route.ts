import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { employees } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          error: 'Valid employee ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    const employeeId = parseInt(id);

    // Check if employee exists
    const existingEmployee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (existingEmployee.length === 0) {
      return NextResponse.json(
        {
          error: 'Employee not found',
          code: 'EMPLOYEE_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, email, department, photo_url, nfc_card_id, salary, hourly_rate } = body;

    // Build update object with only provided fields
    const updates: {
      name?: string;
      email?: string;
      department?: string;
      photoUrl?: string;
      nfcCardId?: string;
      salary?: number;
      hourlyRate?: number;
    } = {};

    // Validate and sanitize name
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return NextResponse.json(
          {
            error: 'Name cannot be empty',
            code: 'INVALID_NAME',
          },
          { status: 400 }
        );
      }
      updates.name = trimmedName;
    }

    // Validate and sanitize email
    if (email !== undefined) {
      const trimmedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return NextResponse.json(
          {
            error: 'Invalid email format',
            code: 'INVALID_EMAIL',
          },
          { status: 400 }
        );
      }

      // Check if email already exists (excluding current employee)
      const emailExists = await db
        .select()
        .from(employees)
        .where(eq(employees.email, trimmedEmail))
        .limit(1);

      if (emailExists.length > 0 && emailExists[0].id !== employeeId) {
        return NextResponse.json(
          {
            error: 'Email already exists',
            code: 'EMAIL_ALREADY_EXISTS',
          },
          { status: 409 }
        );
      }

      updates.email = trimmedEmail;
    }

    // Sanitize department
    if (department !== undefined) {
      updates.department = department ? department.trim() : null;
    }

    // Sanitize photo_url
    if (photo_url !== undefined) {
      updates.photoUrl = photo_url ? photo_url.trim() : null;
    }

    // Validate and sanitize nfc_card_id
    if (nfc_card_id !== undefined) {
      const trimmedNfcCardId = nfc_card_id ? nfc_card_id.trim() : null;

      if (trimmedNfcCardId) {
        // Check if nfc_card_id already exists (excluding current employee)
        const nfcCardExists = await db
          .select()
          .from(employees)
          .where(eq(employees.nfcCardId, trimmedNfcCardId))
          .limit(1);

        if (nfcCardExists.length > 0 && nfcCardExists[0].id !== employeeId) {
          return NextResponse.json(
            {
              error: 'NFC card ID already exists',
              code: 'NFC_CARD_ID_ALREADY_EXISTS',
            },
            { status: 409 }
          );
        }
      }

      updates.nfcCardId = trimmedNfcCardId;
    }

    // Validate salary
    if (salary !== undefined) {
      if (salary !== null) {
        const parsedSalary = parseFloat(salary);
        if (isNaN(parsedSalary) || parsedSalary < 0) {
          return NextResponse.json(
            {
              error: 'Salary must be a valid positive number',
              code: 'INVALID_SALARY',
            },
            { status: 400 }
          );
        }
        updates.salary = parsedSalary;
      } else {
        updates.salary = null;
      }
    }

    // Validate hourly_rate
    if (hourly_rate !== undefined) {
      if (hourly_rate !== null) {
        const parsedHourlyRate = parseFloat(hourly_rate);
        if (isNaN(parsedHourlyRate) || parsedHourlyRate < 0) {
          return NextResponse.json(
            {
              error: 'Hourly rate must be a valid positive number',
              code: 'INVALID_HOURLY_RATE',
            },
            { status: 400 }
          );
        }
        updates.hourlyRate = parsedHourlyRate;
      } else {
        updates.hourlyRate = null;
      }
    }

    // Check if there are any fields to update
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          error: 'No valid fields to update',
          code: 'NO_FIELDS_TO_UPDATE',
        },
        { status: 400 }
      );
    }

    // Update employee
    const updatedEmployee = await db
      .update(employees)
      .set(updates)
      .where(eq(employees.id, employeeId))
      .returning();

    return NextResponse.json(updatedEmployee[0], { status: 200 });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          error: 'Valid employee ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    const employeeId = parseInt(id);

    // Check if employee exists
    const existingEmployee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (existingEmployee.length === 0) {
      return NextResponse.json(
        {
          error: 'Employee not found',
          code: 'EMPLOYEE_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Delete employee
    await db.delete(employees).where(eq(employees.id, employeeId)).returning();

    return NextResponse.json(
      {
        message: 'Employee deleted successfully',
        id: employeeId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}
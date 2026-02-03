import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, employees } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

interface EmployeeUser {
  name: string;
  email: string;
  password: string;
  role: string;
}

const testEmployees: EmployeeUser[] = [
  {
    name: 'TechSonance Admin',
    email: 'admin@techsonance.co.in',
    password: 'TechSonance1711!@#$',
    role: 'admin'
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    password: 'password123',
    role: 'employee'
  },
  {
    name: 'Michael Chen',
    email: 'michael.chen@company.com',
    password: 'password123',
    role: 'employee'
  },
  {
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@company.com',
    password: 'password123',
    role: 'employee'
  }
];

export async function POST(request: NextRequest) {
  try {
    const createdUsers = [];
    const existingUsers = [];

    for (const employeeData of testEmployees) {
      let message = '';

      // FORCE RECREATE ADMIN: Delete if exists to fix password hash issue
      if (employeeData.email === 'admin@techsonance.co.in') {
        await db.delete(user).where(eq(user.email, employeeData.email));
        // also delete employee record to be clean
        await db.delete(employees).where(eq(employees.email, employeeData.email));
      }

      // Check if user already exists
      const existingUser = await db.select()
        .from(user)
        .where(eq(user.email, employeeData.email))
        .limit(1);

      if (existingUser.length > 0) {
        existingUsers.push({
          id: existingUser[0].id,
          name: existingUser[0].name,
          email: existingUser[0].email,
          role: existingUser[0].role,
          message: 'User already exists - can be used for login'
        });
        message = 'User already exists';
      } else {
        // Create user using Better Auth API to ensure correct password hashing
        try {
          // signUpEmail returns { user, session } or throws/returns error
          const res = await auth.api.signUpEmail({
            body: {
              email: employeeData.email,
              password: employeeData.password,
              name: employeeData.name,
            },
            asResponse: false
          });

          if (res?.user) {
            // Update role manually as additionalField
            await db.update(user)
              .set({ role: employeeData.role })
              .where(eq(user.id, res.user.id));

            createdUsers.push({
              id: res.user.id,
              name: res.user.name,
              email: res.user.email,
              role: employeeData.role,
              message: 'User created successfully'
            });
            message = 'User created successfully';
          }
        } catch (err: any) {
          console.error(`Failed to create user ${employeeData.email}:`, err);
          // If error is "User already exists", we should treat it as existing
          if (err?.body?.message === "User already exists" || err?.message?.includes("already exists")) {
            existingUsers.push({
              id: 'unknown',
              name: employeeData.name,
              email: employeeData.email,
              role: employeeData.role,
              message: 'User already exists'
            });
            message = 'User already exists';
          } else {
            // Log failure but continue
            createdUsers.push({
              id: 'failed',
              name: employeeData.name,
              email: employeeData.email,
              role: employeeData.role,
              message: `Failed to create user: ${err.message}`
            });
          }
        }
      }

      // Check if employee record exists
      const existingEmployee = await db.select()
        .from(employees)
        .where(eq(employees.email, employeeData.email))
        .limit(1);

      let employeeMessage = '';

      if (existingEmployee.length === 0) {
        const now = new Date();
        // Create employee record
        await db.insert(employees).values({
          name: employeeData.name,
          email: employeeData.email,
          department: employeeData.role === 'admin' ? 'Management' : 'Engineering',
          status: 'active',
          createdAt: now.toISOString(),
          // Default values
          photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${employeeData.name}`,
          salary: 50000,
          enrollmentDate: now.toISOString()
        });
        employeeMessage = ' and Employee record created';
      } else {
        employeeMessage = ' (Employee record already exists)';
      }

      // Update message for the last processed user if it was a new user
      if (createdUsers.length > 0 && createdUsers[createdUsers.length - 1].email === employeeData.email) {
        createdUsers[createdUsers.length - 1].message += employeeMessage;
      }
    }

    const response = {
      created: createdUsers,
      existing: existingUsers,
      summary: {
        totalProcessed: testEmployees.length,
        newlyCreated: createdUsers.length,
        alreadyExisting: existingUsers.length
      }
    };

    if (createdUsers.length > 0) {
      return NextResponse.json(response, { status: 201 });
    } else {
      return NextResponse.json(response, { status: 200 });
    }

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}
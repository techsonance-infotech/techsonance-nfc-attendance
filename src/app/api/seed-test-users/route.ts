import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

interface EmployeeUser {
  name: string;
  email: string;
  password: string;
  role: string;
}

const testEmployees: EmployeeUser[] = [
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
        continue;
      }

      // Generate unique ID for user
      const userId = randomUUID();
      const accountId = randomUUID();
      const now = new Date();

      // Hash password using bcrypt
      const hashedPassword = await bcrypt.hash(employeeData.password, 10);

      // Insert user record
      const newUser = await db.insert(user)
        .values({
          id: userId,
          name: employeeData.name,
          email: employeeData.email,
          emailVerified: true,
          role: employeeData.role,
          createdAt: now,
          updatedAt: now
        })
        .returning();

      // Insert account record
      await db.insert(account)
        .values({
          id: accountId,
          accountId: employeeData.email,
          providerId: 'credential',
          userId: userId,
          password: hashedPassword,
          createdAt: now,
          updatedAt: now
        })
        .returning();

      createdUsers.push({
        id: newUser[0].id,
        name: newUser[0].name,
        email: newUser[0].email,
        role: newUser[0].role,
        message: 'User created successfully - can be used for login with password: password123'
      });
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
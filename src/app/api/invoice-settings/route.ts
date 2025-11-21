import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { invoiceSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET - Fetch invoice settings
export async function GET(request: NextRequest) {
  try {
    const settings = await db.select()
      .from(invoiceSettings)
      .limit(1);

    if (settings.length === 0) {
      return NextResponse.json({ 
        message: "No settings found", 
        data: null 
      }, { status: 200 });
    }

    return NextResponse.json(settings[0], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

// POST - Create new settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      businessName, 
      businessAddress, 
      businessPhone, 
      businessEmail, 
      logoUrl, 
      termsAndConditions, 
      notes 
    } = body;

    // Validate required field
    if (!businessName) {
      return NextResponse.json({ 
        error: "Business name is required",
        code: "MISSING_BUSINESS_NAME" 
      }, { status: 400 });
    }

    // Validate businessName is not empty
    const trimmedBusinessName = businessName.trim();
    if (trimmedBusinessName === '') {
      return NextResponse.json({ 
        error: "Business name cannot be empty",
        code: "INVALID_BUSINESS_NAME" 
      }, { status: 400 });
    }

    // Validate email format if provided
    if (businessEmail && businessEmail.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(businessEmail.trim())) {
        return NextResponse.json({ 
          error: "Invalid email format",
          code: "INVALID_EMAIL" 
        }, { status: 400 });
      }
    }

    // Check if settings already exist
    const existingSettings = await db.select()
      .from(invoiceSettings)
      .limit(1);

    if (existingSettings.length > 0) {
      return NextResponse.json({ 
        error: "Settings already exist. Use PUT to update.",
        code: "SETTINGS_EXIST" 
      }, { status: 400 });
    }

    // Prepare insert data
    const now = new Date().toISOString();
    const insertData: any = {
      businessName: trimmedBusinessName,
      createdAt: now,
      updatedAt: now
    };

    // Add optional fields if provided
    if (businessAddress !== undefined) {
      insertData.businessAddress = businessAddress ? businessAddress.trim() : null;
    }
    if (businessPhone !== undefined) {
      insertData.businessPhone = businessPhone ? businessPhone.trim() : null;
    }
    if (businessEmail !== undefined) {
      insertData.businessEmail = businessEmail ? businessEmail.trim() : null;
    }
    if (logoUrl !== undefined) {
      insertData.logoUrl = logoUrl ? logoUrl.trim() : null;
    }
    if (termsAndConditions !== undefined) {
      insertData.termsAndConditions = termsAndConditions ? termsAndConditions.trim() : null;
    }
    if (notes !== undefined) {
      insertData.notes = notes ? notes.trim() : null;
    }

    // Insert settings
    const newSettings = await db.insert(invoiceSettings)
      .values(insertData)
      .returning();

    return NextResponse.json(newSettings[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

// PUT - Update existing settings
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const body = await request.json();
    const { 
      businessName, 
      businessAddress, 
      businessPhone, 
      businessEmail, 
      logoUrl, 
      termsAndConditions, 
      notes 
    } = body;

    // Validate businessName if provided
    if (businessName !== undefined) {
      const trimmedBusinessName = businessName.trim();
      if (trimmedBusinessName === '') {
        return NextResponse.json({ 
          error: "Business name cannot be empty",
          code: "INVALID_BUSINESS_NAME" 
        }, { status: 400 });
      }
    }

    // Validate email format if provided
    if (businessEmail !== undefined && businessEmail !== null && businessEmail.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(businessEmail.trim())) {
        return NextResponse.json({ 
          error: "Invalid email format",
          code: "INVALID_EMAIL" 
        }, { status: 400 });
      }
    }

    // Check if settings exist
    const existingSettings = await db.select()
      .from(invoiceSettings)
      .where(eq(invoiceSettings.id, parseInt(id)))
      .limit(1);

    if (existingSettings.length === 0) {
      return NextResponse.json({ 
        error: "Settings not found",
        code: "NOT_FOUND" 
      }, { status: 404 });
    }

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (businessName !== undefined) {
      updateData.businessName = businessName.trim();
    }
    if (businessAddress !== undefined) {
      updateData.businessAddress = businessAddress ? businessAddress.trim() : null;
    }
    if (businessPhone !== undefined) {
      updateData.businessPhone = businessPhone ? businessPhone.trim() : null;
    }
    if (businessEmail !== undefined) {
      updateData.businessEmail = businessEmail ? businessEmail.trim() : null;
    }
    if (logoUrl !== undefined) {
      updateData.logoUrl = logoUrl ? logoUrl.trim() : null;
    }
    if (termsAndConditions !== undefined) {
      updateData.termsAndConditions = termsAndConditions ? termsAndConditions.trim() : null;
    }
    if (notes !== undefined) {
      updateData.notes = notes ? notes.trim() : null;
    }

    // Update settings
    const updatedSettings = await db.update(invoiceSettings)
      .set(updateData)
      .where(eq(invoiceSettings.id, parseInt(id)))
      .returning();

    return NextResponse.json(updatedSettings[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

// DELETE - Delete settings
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if settings exist
    const existingSettings = await db.select()
      .from(invoiceSettings)
      .where(eq(invoiceSettings.id, parseInt(id)))
      .limit(1);

    if (existingSettings.length === 0) {
      return NextResponse.json({ 
        error: "Settings not found",
        code: "NOT_FOUND" 
      }, { status: 404 });
    }

    // Delete settings
    const deletedSettings = await db.delete(invoiceSettings)
      .where(eq(invoiceSettings.id, parseInt(id)))
      .returning();

    return NextResponse.json({ 
      message: "Settings deleted successfully",
      deletedSettings: deletedSettings[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}
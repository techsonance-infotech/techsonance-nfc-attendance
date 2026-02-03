import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { invoiceSettings } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Settings are viewable by all authenticated users (or maybe just admin/hr?)
        // Allowing all for now as it affects reports/invoices usually viewable by staff.

        const settings = await db.select().from(invoiceSettings).limit(1);

        if (settings.length === 0) {
            return NextResponse.json({}, { status: 200 }); // Return empty object if not set
        }

        return NextResponse.json(settings[0], { status: 200 });
    } catch (error) {
        console.error('GET settings error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        if (user.role !== 'admin') {
            return NextResponse.json({ error: 'Admin permissions required' }, { status: 403 });
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

        if (!businessName) {
            return NextResponse.json({ error: 'Business Name is required' }, { status: 400 });
        }

        const now = new Date().toISOString();
        const existing = await db.select().from(invoiceSettings).limit(1);

        let result;
        if (existing.length > 0) {
            // Update
            result = await db.update(invoiceSettings)
                .set({
                    businessName,
                    businessAddress: businessAddress || null,
                    businessPhone: businessPhone || null,
                    businessEmail: businessEmail || null,
                    logoUrl: logoUrl || null,
                    termsAndConditions: termsAndConditions || null,
                    notes: notes || null,
                    updatedAt: now
                })
                .where(eq(invoiceSettings.id, existing[0].id))
                .returning();
        } else {
            // Create
            result = await db.insert(invoiceSettings)
                .values({
                    businessName,
                    businessAddress: businessAddress || null,
                    businessPhone: businessPhone || null,
                    businessEmail: businessEmail || null,
                    logoUrl: logoUrl || null,
                    termsAndConditions: termsAndConditions || null,
                    notes: notes || null,
                    createdAt: now,
                    updatedAt: now
                })
                .returning();
        }

        return NextResponse.json(result[0], { status: 200 });

    } catch (error) {
        console.error('POST settings error:', error);
        return NextResponse.json(
            { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
            { status: 500 }
        );
    }
}

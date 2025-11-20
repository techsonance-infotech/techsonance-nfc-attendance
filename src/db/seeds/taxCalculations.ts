import { db } from '@/db';
import { taxCalculations } from '@/db/schema';

async function main() {
    const sampleTaxCalculations = [
        {
            financialYear: '2023-24',
            employeeId: 1,
            grossIncome: 900000,
            deductions: 150000,
            taxableIncome: 750000,
            taxAmount: 37500,
            calculatedAt: new Date('2024-03-15').toISOString(),
        },
        {
            financialYear: '2023-24',
            employeeId: 2,
            grossIncome: 825000,
            deductions: 150000,
            taxableIncome: 675000,
            taxAmount: 28750,
            calculatedAt: new Date('2024-03-15').toISOString(),
        },
        {
            financialYear: '2023-24',
            employeeId: 3,
            grossIncome: 750000,
            deductions: 150000,
            taxableIncome: 600000,
            taxAmount: 15000,
            calculatedAt: new Date('2024-03-15').toISOString(),
        },
        {
            financialYear: '2023-24',
            employeeId: 4,
            grossIncome: 675000,
            deductions: 150000,
            taxableIncome: 525000,
            taxAmount: 11250,
            calculatedAt: new Date('2024-03-15').toISOString(),
        },
        {
            financialYear: '2023-24',
            employeeId: 5,
            grossIncome: 600000,
            deductions: 150000,
            taxableIncome: 450000,
            taxAmount: 7500,
            calculatedAt: new Date('2024-03-15').toISOString(),
        },
    ];

    await db.insert(taxCalculations).values(sampleTaxCalculations);
    
    console.log('✅ Tax calculations seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});
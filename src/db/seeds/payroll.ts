import { db } from '@/db';
import { payroll } from '@/db/schema';

async function main() {
    const employeeSalaries = {
        1: 60000,
        2: 55000,
        3: 50000,
        4: 45000,
        5: 40000,
    };

    const calculatePayroll = (employeeId: number, month: number, year: number, status: string) => {
        const basicSalary = employeeSalaries[employeeId as keyof typeof employeeSalaries];
        const allowances = basicSalary * 0.50;
        const deductions = basicSalary * 0.05;
        const grossSalary = basicSalary + allowances;
        const pfAmount = basicSalary * 0.12;
        const esicAmount = grossSalary < 21000 ? grossSalary * 0.0075 : 0;
        
        let tdsRate = 0.02;
        if (grossSalary > 70000) tdsRate = 0.05;
        else if (grossSalary > 50000) tdsRate = 0.03;
        
        const tdsAmount = grossSalary * tdsRate;
        const netSalary = grossSalary - deductions - pfAmount - esicAmount - tdsAmount;

        let paymentDate = null;
        if (status === 'paid') {
            const payDay = 28;
            paymentDate = new Date(year, month - 1, payDay).toISOString();
        }

        const createdDate = new Date(year, month - 1, 1);
        
        return {
            employeeId,
            month,
            year,
            basicSalary,
            allowances,
            deductions,
            grossSalary,
            netSalary,
            pfAmount,
            esicAmount,
            tdsAmount,
            status,
            paymentDate,
            createdAt: createdDate.toISOString(),
            updatedAt: createdDate.toISOString(),
        };
    };

    const samplePayroll = [
        // Employee 1 - November 2024 (paid)
        calculatePayroll(1, 11, 2024, 'paid'),
        // Employee 1 - December 2024 (paid)
        calculatePayroll(1, 12, 2024, 'paid'),
        // Employee 1 - January 2025 (processed)
        calculatePayroll(1, 1, 2025, 'processed'),

        // Employee 2 - November 2024 (paid)
        calculatePayroll(2, 11, 2024, 'paid'),
        // Employee 2 - December 2024 (paid)
        calculatePayroll(2, 12, 2024, 'paid'),
        // Employee 2 - January 2025 (processed)
        calculatePayroll(2, 1, 2025, 'processed'),

        // Employee 3 - November 2024 (paid)
        calculatePayroll(3, 11, 2024, 'paid'),
        // Employee 3 - December 2024 (paid)
        calculatePayroll(3, 12, 2024, 'paid'),
        // Employee 3 - January 2025 (processed)
        calculatePayroll(3, 1, 2025, 'processed'),

        // Employee 4 - November 2024 (paid)
        calculatePayroll(4, 11, 2024, 'paid'),
        // Employee 4 - December 2024 (paid)
        calculatePayroll(4, 12, 2024, 'paid'),
        // Employee 4 - January 2025 (processed)
        calculatePayroll(4, 1, 2025, 'processed'),

        // Employee 5 - November 2024 (paid)
        calculatePayroll(5, 11, 2024, 'paid'),
        // Employee 5 - December 2024 (paid)
        calculatePayroll(5, 12, 2024, 'paid'),
        // Employee 5 - January 2025 (processed)
        calculatePayroll(5, 1, 2025, 'processed'),
    ];

    await db.insert(payroll).values(samplePayroll);
    
    console.log('✅ Payroll seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});
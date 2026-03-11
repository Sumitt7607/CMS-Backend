const Payroll = require('../models/Payroll');
const Leave = require('../models/Leave');

// Create payroll entry
const createPayroll = async (req, res) => {
    try {
        const { userId, month, base, bonus, tax, deductions: clientDeductions } = req.body;

        // Backend Calculation Logic for Unpaid Leave Deductions
        // 1. Parse Month & Year (expecting "Month YYYY")
        const [mName, yearStr] = month.split(' ');
        const year = parseInt(yearStr);
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthIndex = months.indexOf(mName);

        let finalDeductions = Number(clientDeductions);

        if (monthIndex !== -1 && !isNaN(year)) {
            // 2. Fetch approved Unpaid Leaves for this user in this month
            const approvedLeaves = await Leave.find({
                userId,
                status: 'Approved',
                type: 'Unpaid Leave'
            });

            let unpaidDays = 0;
            approvedLeaves.forEach(leave => {
                const start = new Date(leave.startDate);
                const end = new Date(leave.endDate);

                // Check if leave starts in the target month/year
                if (start.getMonth() === monthIndex && start.getFullYear() === year) {
                    const diffTime = Math.abs(end - start);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    unpaidDays += diffDays;
                }
            });

            // 3. Apply Deduction Formula: (Base / DaysInMonth) * (UnpaidDays - 2)
            if (unpaidDays > 2) {
                const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
                const autoDeduction = (Number(base) / daysInMonth) * (unpaidDays - 2);

                // We use the client provided deduction if it exists, otherwise auto-calculate
                // This allows manual overrides but defaults to our logic
                if (!clientDeductions || clientDeductions === 0) {
                    finalDeductions = Math.round(autoDeduction);
                }
            }
        }

        const netPay = Number(base) + Number(bonus) - Number(tax) - finalDeductions;

        const payroll = new Payroll({
            userId,
            month,
            base: Number(base),
            bonus: Number(bonus),
            tax: Number(tax),
            deductions: finalDeductions,
            netPay,
            status: 'Pending'
        });

        await payroll.save();
        res.status(201).json(payroll);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all payrolls
const getAllPayroll = async (req, res) => {
    try {
        const payrolls = await Payroll.find().populate('userId', 'name email').sort({ createdAt: -1 });
        res.json(payrolls);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update status
const updatePayrollStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) return res.status(404).json({ message: 'Payroll not found' });

        payroll.status = status;
        if (status === 'Paid') {
            payroll.paymentDate = new Date();
        }

        await payroll.save();
        res.json(payroll);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get employee's own payroll
const getMyPayroll = async (req, res) => {
    try {
        const payrolls = await Payroll.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(payrolls);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createPayroll,
    getAllPayroll,
    updatePayrollStatus,
    getMyPayroll
};

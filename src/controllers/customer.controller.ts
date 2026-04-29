import { Request, Response, NextFunction } from 'express';
import { getAllCustomers, getCustomerById, searchCustomers } from '../services/customer.service';
import { createError } from '../middleware/error.middleware';

// ─── GET /api/customers ───────────────────────────────────────────────────────

export function getCustomers(req: Request, res: Response, next: NextFunction): void {
    try {
        const { search } = req.query;

        const customers = search
            ? searchCustomers(String(search))
            : getAllCustomers();

        res.status(200).json({
            success: true,
            count: customers.length,
            data: customers,
        });
    } catch (err) {
        next(err);
    }
}

// ─── GET /api/customers/:id ───────────────────────────────────────────────────

export function getCustomer(req: Request, res: Response, next: NextFunction): void {
    try {
        const { id } = req.params;
        const customer = getCustomerById((<string>id));

        if (!customer) {
            return next(createError(`Customer with ID ${id} not found`, 404));
        }

        res.status(200).json({ success: true, data: customer });
    } catch (err) {
        next(err);
    }
}

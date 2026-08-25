import express from 'express';
import authMiddleware from '../../middlewares/authMiddleware.js';
import { requirePermission } from '../../middlewares/authorization.js';
import {
  closePayrollRun,
  createPayrollEvent,
  createPayrollMovement,
  createPayrollRun,
  deletePayrollMovement,
  duplicatePayrollEvent,
  getPayrollCharges,
  getPayrollEventById,
  getPayrollEvents,
  getPayrollPayslipPreview,
  getPayrollPayslips,
  getPayrollRunById,
  getPayrollRunCharges,
  getPayrollRunPayslips,
  getPayrollRunEmployees,
  getPayrollRuns,
  getPayrollTimeSyncPreview,
  processPayrollRun,
  reopenPayrollRun,
  syncPayrollRunFromTime,
  updatePayrollEvent,
  updatePayrollEventStatus,
  updatePayrollMovement,
} from './payrollController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/events', requirePermission('payroll.event.read'), getPayrollEvents);
router.get(
  '/events/:id',
  requirePermission('payroll.event.read'),
  getPayrollEventById
);
router.post(
  '/events',
  requirePermission('payroll.events.create'),
  createPayrollEvent
);
router.put(
  '/events/:id',
  requirePermission('payroll.events.update'),
  updatePayrollEvent
);
router.patch(
  '/events/:id/status',
  requirePermission('payroll.events.status'),
  updatePayrollEventStatus
);
router.post(
  '/events/:id/duplicate',
  requirePermission('payroll.events.create'),
  duplicatePayrollEvent
);
router.get(
  '/payslips',
  requirePermission('payroll.payslip.read'),
  getPayrollPayslips
);
router.get(
  '/charges',
  requirePermission('payroll.charges.read'),
  getPayrollCharges
);
router.get('/runs', requirePermission('payroll.read'), getPayrollRuns);
router.get('/runs/:id', requirePermission('payroll.read'), getPayrollRunById);
router.post('/runs', requirePermission('payroll.read'), createPayrollRun);
router.post(
  '/runs/:id/process',
  requirePermission('payroll.process'),
  processPayrollRun
);
router.post(
  '/runs/:id/close',
  requirePermission('payroll.close'),
  closePayrollRun
);
router.post(
  '/runs/:id/reopen',
  requirePermission('payroll.reopen'),
  reopenPayrollRun
);
router.get(
  '/runs/:id/employees',
  requirePermission('payroll.read', 'payroll.movement.read'),
  getPayrollRunEmployees
);
router.get(
  '/runs/:id/time-sync',
  requirePermission('payroll.read', 'payroll.review_auto_entries'),
  getPayrollTimeSyncPreview
);
router.post(
  '/runs/:id/sync-time',
  requirePermission('payroll.sync_from_time'),
  syncPayrollRunFromTime
);
router.get(
  '/runs/:id/payslips',
  requirePermission('payroll.payslip.read'),
  getPayrollRunPayslips
);
router.get(
  '/runs/:id/payslips/:employeeId',
  requirePermission('payroll.payslip.read'),
  getPayrollPayslipPreview
);
router.get(
  '/runs/:id/charges',
  requirePermission('payroll.charges.read'),
  getPayrollRunCharges
);
router.post(
  '/runs/:id/movements',
  requirePermission('payroll.movement.create'),
  createPayrollMovement
);
router.put(
  '/movements/:id',
  requirePermission('payroll.movement.update'),
  updatePayrollMovement
);
router.delete(
  '/movements/:id',
  requirePermission('payroll.movement.delete'),
  deletePayrollMovement
);

export default router;

import { employeeSchema } from '../schemas/employeeSchema.js';
import AppError from '../errors/AppError.js';
import {
  createEmployeeService,
  getAllEmployeesService,
  getEmployeeByIdService,
  updateEmployeeService,
  deleteEmployeeService,
} from '../services/employeeService.js';
import { createAuditLog } from '../services/auditService.js';

export const createEmployee = async (req, res, next) => {
  const validation = employeeSchema.safeParse(req.body);

  if (!validation.success) {
    return next(new AppError('Dados inválidos', 400));
  }

  try {
    const employee = await createEmployeeService(req.body, req.user.companyId);

    await createAuditLog({
      req,
      module: 'employees',
      entityType: 'employee',
      entityId: employee.id,
      action: 'CREATE',
      severity: 'INFO',
      summary: `Colaborador "${employee.name}" cadastrado`,
      after: employee,
    });

    res.status(201).json({
      message: 'Funcionário criado com sucesso',
      employee,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllEmployees = async (req, res, next) => {
  try {
    const employees = await getAllEmployeesService(req.user.companyId, {
      scope: req.query.scope,
      companyId: req.query.companyId,
      companyScope: req.query.companyScope,
    });

    res.json({
      message: 'Funcionários encontrados com sucesso',
      employees,
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const employee = await getEmployeeByIdService(id, req.user.companyId, {
      scope: req.query.scope,
      companyId: req.query.companyId,
    });

    res.json({
      message: 'Funcionário encontrado com sucesso',
      employee,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  const validation = employeeSchema.safeParse(req.body);

  if (!validation.success) {
    return next(new AppError('Dados inválidos', 400));
  }

  try {
    const id = Number(req.params.id);
    const employee = await updateEmployeeService(
      id,
      req.body,
      req.user.companyId,
      req.query.scope
    );

    await createAuditLog({
      req,
      module: 'employees',
      entityType: 'employee',
      entityId: employee.id,
      action: 'UPDATE',
      severity: 'WARNING',
      summary: `Colaborador "${employee.name}" atualizado`,
      after: employee,
    });

    res.json({
      message: 'Funcionário atualizado com sucesso',
      employee,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const employee = await getEmployeeByIdService(id, req.user.companyId, {
      scope: req.query.scope,
      companyId: req.query.companyId,
    });
    await deleteEmployeeService(id, req.user.companyId, req.query.scope);

    await createAuditLog({
      req,
      module: 'employees',
      entityType: 'employee',
      entityId: id,
      action: 'SOFT_DELETE',
      severity: 'CRITICAL',
      summary: `Colaborador "${employee.name}" removido do cadastro`,
      before: employee,
    });

    res.json({
      message: 'Funcionário deletado com sucesso',
    });
  } catch (error) {
    next(error);
  }
};

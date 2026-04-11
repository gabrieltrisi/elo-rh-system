import { employeeSchema } from '../schemas/employeeSchema.js';
import AppError from '../errors/AppError.js';
import {
  createEmployeeService,
  getAllEmployeesService,
  getEmployeeByIdService,
  updateEmployeeService,
  deleteEmployeeService,
} from '../services/employeeService.js';

export const createEmployee = async (req, res, next) => {
  const validation = employeeSchema.safeParse(req.body);

  if (!validation.success) {
    return next(new AppError('Dados inválidos', 400));
  }

  try {
    const employee = await createEmployeeService(req.body, req.user.companyId);

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
    const employees = await getAllEmployeesService(req.user.companyId);

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
    const employee = await getEmployeeByIdService(id, req.user.companyId);

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
      req.user.companyId
    );

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
    await deleteEmployeeService(id, req.user.companyId);

    res.json({
      message: 'Funcionário deletado com sucesso',
    });
  } catch (error) {
    next(error);
  }
};

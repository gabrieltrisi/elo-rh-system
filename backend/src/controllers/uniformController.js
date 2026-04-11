import { uniformSchema } from '../schemas/uniformSchema.js';
import AppError from '../errors/AppError.js';
import {
  createUniformService,
  getAllUniformsService,
  getUniformsByEmployeeService,
} from '../services/uniformService.js';

export const createUniform = async (req, res, next) => {
  const parsedBody = {
    ...req.body,
    employeeId: Number(req.body.employeeId),
    quantity: Number(req.body.quantity),
  };

  const validation = uniformSchema.safeParse(parsedBody);

  if (!validation.success) {
    return next(new AppError('Dados inválidos', 400));
  }

  try {
    const uniform = await createUniformService(parsedBody);

    res.status(201).json({
      message: 'Fardamento cadastrado com sucesso',
      uniform,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUniforms = async (req, res, next) => {
  try {
    const uniforms = await getAllUniformsService();

    res.json({
      message: 'Fardamentos encontrados com sucesso',
      uniforms,
    });
  } catch (error) {
    next(error);
  }
};

export const getUniformsByEmployee = async (req, res, next) => {
  try {
    const employeeId = Number(req.params.employeeId);
    const uniforms = await getUniformsByEmployeeService(employeeId);

    res.json({
      message: 'Fardamentos do colaborador encontrados com sucesso',
      uniforms,
    });
  } catch (error) {
    next(error);
  }
};

import AppError from '../errors/AppError.js';
import {
  createOrUpdateBenefitService,
  getBenefitsService,
  deleteBenefitService,
} from '../services/benefitService.js';

export const createOrUpdateBenefit = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const {
      employeeId,
      transportVoucher,
      transportVoucherType,
      mealVoucher,
      mealVoucherType,
      healthPlan,
      dentalPlan,
      notes,
    } = req.body;

    if (!employeeId) {
      return next(new AppError('Selecione o colaborador', 400));
    }

    if (transportVoucher && !transportVoucherType) {
      return next(new AppError('Informe o tipo do Vale Transporte', 400));
    }

    if (mealVoucher && !mealVoucherType) {
      return next(
        new AppError('Informe o tipo do Vale Alimentação/Refeição', 400)
      );
    }

    const benefit = await createOrUpdateBenefitService(
      {
        employeeId: Number(employeeId),
        transportVoucher: Boolean(transportVoucher),
        transportVoucherType: transportVoucher ? transportVoucherType : null,
        mealVoucher: Boolean(mealVoucher),
        mealVoucherType: mealVoucher ? mealVoucherType : null,
        healthPlan: Boolean(healthPlan),
        dentalPlan: Boolean(dentalPlan),
        notes: notes || null,
      },
      req.user.companyId
    );

    return res.status(200).json({
      message: 'Benefícios salvos com sucesso',
      benefit,
    });
  } catch (error) {
    return next(error);
  }
};

export const getBenefits = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const benefits = await getBenefitsService(req.user.companyId);

    return res.status(200).json({
      message: 'Benefícios encontrados com sucesso',
      benefits,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteBenefit = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const { id } = req.params;

    await deleteBenefitService(Number(id), req.user.companyId);

    return res.status(200).json({
      message: 'Cadastro de benefícios excluído com sucesso',
    });
  } catch (error) {
    return next(error);
  }
};

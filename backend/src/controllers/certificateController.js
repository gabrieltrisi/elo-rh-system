import {
  createCertificate,
  getCertificates,
  updateCertificateStatus,
} from '../services/certificateService.js';

export const create = async (req, res) => {
  try {
    const certificate = await createCertificate({
      ...req.body,
      fileUrl: req.file ? `/uploads/certificates/${req.file.filename}` : null,
    });

    res.status(201).json(certificate);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar atestado' });
  }
};

export const list = async (req, res) => {
  try {
    const certificates = await getCertificates();
    res.json(certificates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar atestados' });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, managerNotes } = req.body;

    const updated = await updateCertificateStatus(id, status, managerNotes);
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
};

import XLSX from 'xlsx';
import path from 'path';

export const generateAccessExcel = (employee, systems) => {
  const data = systems.map((sys) => ({
    Sistema: sys.systemName,
    Link: sys.accessLink,
    Usuario: sys.username,
    Observacoes: sys.notes,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Acessos');

  const filePath = path.resolve(
    `./tmp/acessos_${employee.id}_${Date.now()}.xlsx`
  );

  XLSX.writeFile(wb, filePath);

  return filePath;
};

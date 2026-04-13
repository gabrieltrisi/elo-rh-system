import multer from 'multer';
import path from 'path';
import fs from 'fs';

// 🔥 BASE DE UPLOADS
const baseUploadDir = path.resolve('uploads');

// cria pasta base se não existir
if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}

// 🔥 STORAGE DINÂMICO
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'others';

    // 🔥 define pasta por rota
    if (req.originalUrl.includes('certificates')) {
      folder = 'certificates';
    }

    if (req.originalUrl.includes('documents')) {
      folder = 'documents';
    }

    const uploadPath = path.join(baseUploadDir, folder);

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

export default upload;

const multer = require('multer');

const storage = multer.memoryStorage();

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

function fileFilter(req, file, cb) {
  if (file.fieldname === 'video') {
    if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only MP4, WEBM, or MOV videos are allowed'));
    }
    return cb(null, true);
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, WEBP, or GIF images are allowed'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 30 * 1024 * 1024 },
});

module.exports = upload;

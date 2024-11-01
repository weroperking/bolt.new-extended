export const isValidFileType = (file: File) => {
  const validMimeTypes = [
    'image/',
    'text/',
    'application/pdf',
    'application/json',
    'application/xml',
    'application/csv'
  ];

  const validExtensions = [
    '.js', '.jsx', '.ts', '.tsx',
    '.py',
    '.php', 
    '.java',
    '.rb',
    '.cs',
    '.cpp', '.c', '.h',
    '.go',
    '.rs',
    '.swift',
    '.kt',
    '.r',
    '.sql'
  ];

  const hasSupportedMimeType = validMimeTypes.some(type => file.type.startsWith(type));
  const fileName = file.name.toLowerCase();
  const hasSupportedExtension = validExtensions.some(ext => fileName.endsWith(ext));

  return hasSupportedMimeType || hasSupportedExtension;
};

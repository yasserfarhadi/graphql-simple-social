import fs from 'node:fs';
import path from 'node:path';

export function clearImage(filePath) {
  filePath = path.join(process.cwd(), filePath);
  fs.unlink(filePath, console.log);
}

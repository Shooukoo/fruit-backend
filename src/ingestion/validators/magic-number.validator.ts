import { BadRequestException, Injectable } from '@nestjs/common';
import { Readable } from 'stream';

@Injectable()
export class MagicNumberValidator {
  isValid(buffer: Buffer): boolean {
    if (buffer.length < 4) return false;
    
    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return true;
    }
    
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return true;
    }

    return false;
  }

  async validateStream(stream: Readable): Promise<void> {
    return new Promise((resolve, reject) => {
      let buffer = Buffer.alloc(0);

      const onData = (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);

        if (buffer.length >= 4) {
          stream.removeListener('data', onData);
          stream.pause();

          if (this.isValid(buffer)) {
            stream.unshift(buffer);
            resolve();
          } else {
            stream.destroy();
            reject(new BadRequestException('Invalid file type. Only JPG and PNG allowed.'));
          }
        }
      };

      stream.on('data', onData);
      
      stream.on('error', (err) => reject(err));

      stream.on('end', () => {
        if (buffer.length < 4) {
          reject(new BadRequestException('File too short'));
        }
      });
    });
  }
}

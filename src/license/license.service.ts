import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class LicenseService {
  
  async generateLicenseKey(rif: string, businessName: string): Promise<string> {
    const data = `${rif.replace(/-/g, '')}-${businessName.replace(/\s+/g, '')}`;
    
    // Genera un salt
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);

    // Hashea los datos con bcrypt
    const hash = await bcrypt.hash(data, salt);

    return hash;
  }

  // Método para validar una clave de licencia (si deseas hacerlo)
  async validateLicenseKey(rif: string, businessName: string, licenseKey: string): Promise<boolean> {
    const data = `${rif}-${businessName}`;
    return await bcrypt.compare(data, licenseKey);
  }
}
jest.mock('puppeteer', () => ({ launch: jest.fn() }));
jest.mock('node-thermal-printer', () => ({ ThermalPrinter: jest.fn() }));
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
import { ConflictException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { REQUIRED_PERMISSIONS_KEY } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

describe('Patient results controlled email contract', () => {
  it('protege el POST y propaga actor, id y HTML', async () => {
    const sendPatientResultsEmail = jest.fn().mockResolvedValue({ id: 8, emailStatus: true });
    const controller = new PatientsController({ sendPatientResultsEmail } as unknown as PatientsService);
    await expect(controller.sendPatientResultsEmail({ user: { userId: 7 } }, 8, { resultHtml: '<p>ok</p>' })).resolves.toEqual({ id: 8, emailStatus: true });
    expect(sendPatientResultsEmail).toHaveBeenCalledWith(8, '<p>ok</p>', 7);
    const method = PatientsController.prototype.sendPatientResultsEmail;
    expect(Reflect.getMetadata(GUARDS_METADATA, method)).toEqual([JwtUserGuard, PermissionGuard]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, method)).toEqual(['patient-results-email.send']);
  });
  it('declara bloqueo, PDF en memoria, transaccion y auditoria segura', () => {
    const source = require('fs').readFileSync(require('path').join(process.cwd(), 'src/patients/patients.service.ts'), 'utf8');
    expect(source).toContain('resultsEmailInProgress');
    expect(source).toContain('generatePdfFromHtmlOut(resultHtml)');
    expect(source).toContain('PATIENT_RESULTS_EMAIL_CONTENT_EMPTY');
    expect(source).toContain('PATIENT_RESULTS_EMAIL_PDF_EMPTY');
    expect(source).toContain("waitUntil: 'load'");
    expect(source).toContain('printBackground: true');
    expect(source).toContain("attachments: [{ filename: `resultados-${patient.id}.pdf`, content: pdf");
    expect(source).toContain('this.dataSource.transaction');
    expect(source).toContain('patient.results-email.resent');
    expect(source).toContain("deliveryType = patient.email_status ? 'resend' : 'send'");
    expect(source).toContain("deliveryType === 'resend' ? 'patient.results-email.resent' : 'patient.results-email.sent'");
    expect(source).toContain("status: 'started'");
    expect(source).toContain("attempt.status = 'success'");
    expect(source).toContain("attempt.status = 'failed'");
    expect(source).toContain("metadata: { deliveryMethod: 'email', deliveryType }");
    expect(source).not.toContain("metadata: { email:");
    expect(source).not.toContain("metadata: { resultHtml:");
    expect(source).toContain('getPatientResultsEmailHistory');
    expect(source).toContain(".innerJoin('users', 'requester'");
  });
});

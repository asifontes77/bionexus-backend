import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Query,
  Req,
  Patch,
  UseGuards,
  Injectable,
  Res,
} from '@nestjs/common';
import { Patient } from './patients.entity';
import { PatientsService } from './patients.service';
import { UpdatePatientsDto } from './dto/update-patients.dto';
import { CreatePatientsDto } from './dto/create-patients.dto';
import { SendPatientResultsEmailDto } from './dto/send-patient-results-email.dto';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { getSecurityAuditActorUserId, SecurityAuthenticatedRequest } from '../audit/security-audit-context';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { Response } from 'express';

@Controller('patients')
@Injectable()
export class PatientsController {
  constructor(private patienService: PatientsService) {}

  @UseGuards(JwtUserGuard)
  @Get('/date/:admissiondate')
  getPatientsDate(
    @Param('admissiondate') admissionDate: Date,
  ): Promise<Patient[]> {
    return this.patienService.getPatientsDate(admissionDate);
  }

  @UseGuards(JwtUserGuard)
  @Get('/dateorder/:admissiondate')
  getPatientsDateOrder(
    @Param('admissiondate') admissionDate: Date,
  ): Promise<Patient[]> {
    return this.patienService.getPatientsDateOrder(admissionDate);
  }

  @UseGuards(JwtUserGuard)
  @Get()
  getPatientLists() {
    return this.patienService.getPatientLists();
  }

  @UseGuards(JwtUserGuard)
  @Get('/dateresult/:admissiondate')
  getPatientsDateResult(
    @Param('admissiondate') admissionDate: Date,
  ): Promise<Patient[]> {
    return this.patienService.getPatientsDateResult(admissionDate);
  }

  @UseGuards(JwtUserGuard)
  @Post('/invoicelist')
  getPatientsWithInvoice(@Body() body: { date: Date }): Promise<Patient[]> {
    return this.patienService.getPatientsWithInvoice(body.date);
  }

  @UseGuards(JwtUserGuard)
  @Post('/speciallist')
  async getPatientsSpecial(
    @Body() body: { firstDate: string; lastDate: string; examIds: number[] },
  ) {
    const { firstDate, lastDate, examIds } = body;

    return this.patienService.getPatientsSpecial(firstDate, lastDate, examIds);
  }

  @UseGuards(JwtUserGuard)
  @Post('/querieslist')
  getPatientsWithQueries(
    @Body()
    body: {
      firstDate: string;
      lastDate: string;
      namePatient: string;
      userSelection: number;
      clientSelection: number;
      clientSelectionStatus: number;
      ciPatient: string;
      invoice: boolean;
    },
  ) {
    return this.patienService.getPatientsWithQueries(
      body.firstDate,
      body.lastDate,
      body.namePatient,
      body.userSelection,
      body.clientSelection,
      body.clientSelectionStatus,
      body.ciPatient,
      body.invoice,
    );
  }

  @UseGuards(JwtUserGuard)
  @Post('/queriestotal')
  getPatientsWithQueriesTotal(
    @Body()
    body: {
      firstDate: string;
      lastDate: string;
      namePatient: string;
      userSelection: number;
      clientSelection: number;
      clientSelectionStatus: number;
      ciPatient: string;
      invoice: boolean;
    },
  ) {
    return this.patienService.getPatientsWithQueriesTotal(
      body.firstDate,
      body.lastDate,
      body.namePatient,
      body.userSelection,
      body.clientSelection,
      body.clientSelectionStatus,
      body.ciPatient,
      body.invoice,
    );
  }

  @UseGuards(JwtUserGuard)
  @Post('/totalmonth')
  getTotalPatientsMonth(@Body() body: { firstDate: Date; lastDate: Date }) {
    return this.patienService.getTotalPatientsMonth(
      body.firstDate,
      body.lastDate,
    );
  }

  @UseGuards(JwtUserGuard)
  @Get('/idresult/:id')
  getPatientsIdResult(@Param('id', ParseIntPipe) id: number) {
    return this.patienService.getPatientsIdResult(id);
  }

  @UseGuards(JwtUserGuard)
  @Get('/validresult/:id')
  getPatientIdValidatedResult(@Param('id', ParseIntPipe) id: number) {
    return this.patienService.getPatientIdValidatedResult(id);
  }

  @UseGuards(JwtUserGuard)
  @Get('/dateresult-group/:admissiondate')
  getPatientsDateGroupResult(
    @Param('admissiondate') admissionDate: Date,
  ): Promise<Patient[]> {
    return this.patienService.getPatientsDateGroupResult(admissionDate);
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('patient-results-email.read')
  @Get('/results-email')
  getPatientResultsEmailCandidates(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.patienService.getPatientResultsEmailCandidates(dateFrom, dateTo);
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('patient-results-email.send')
  @Post(':id/results-email')
  sendPatientResultsEmail(
    @Req() request: SecurityAuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SendPatientResultsEmailDto,
  ) {
    const actorUserId = getSecurityAuditActorUserId(request);
    return this.patienService.sendPatientResultsEmail(id, body?.resultHtml, actorUserId ?? undefined);
  }

  @UseGuards(JwtUserGuard)
  @Get('/approved/:admissiondate')
  getPatientResultsDatesApproved(
    @Param('admissiondate') admissionDate: Date,
  ): Promise<Patient[]> {
    return this.patienService.getPatientResultsDatesApproved(admissionDate);
  }

  @UseGuards(JwtUserGuard)
  @Get('/worksheet/:admissiondate')
  getPatientsDateWorksheetResult(
    @Param('admissiondate') admissionDate: Date,
  ): Promise<Patient[]> {
    return this.patienService.getPatientsDateWorksheetResult(admissionDate);
  }

  @UseGuards(JwtUserGuard)
  @Get('/total/:admissiondate')
  getPatientsTotalByDate(@Param('admissiondate') admissionDate: Date) {
    return this.patienService.getPatientsTotalByDate(admissionDate);
  }

  @UseGuards(JwtUserGuard)
  @Get('/ci/:ci')
  getPatientsCI(@Param('ci') ci: string) {
    return this.patienService.getPatientsCI(ci);
  }

  @UseGuards(JwtUserGuard)
  @Get(':id')
  getPatient(@Param('id', ParseIntPipe) id: number) {
    return this.patienService.getPatient(id);
  }

  @UseGuards(JwtUserGuard)
  @Get('idorder/:id')
  getPatientOrder(@Param('id', ParseIntPipe) id: number) {
    return this.patienService.getPatientOrder(id);
  }

  @UseGuards(JwtUserGuard)
  @Get('/voucher/:id')
  async getPaitentVoucher(@Param('id', ParseIntPipe) id: number) {
    await this.patienService.printReceipt(id);
    return true;
  }

  @Get('/mailer/:id')
  @UseGuards(JwtUserGuard)
  @Get('/mailer/:id')
  async enviarCorreo(@Param('id', ParseIntPipe) id: number) {
    console.log('pacienteId: ', id);
    const rowTmp = await this.patienService.getPatient(id);
    const row = JSON.parse(JSON.stringify(rowTmp));
    console.log('paciente: ', row);
    const file = `${row.id}.pdf`;
    const outputPath = `public/pdf/${file}`;
    await this.patienService.generatePdfFromHtml(row.result_html, outputPath);
    const destinatario = row.email;
    const asunto = 'Resultados de exámenes Laboratorio';
    const contenido = `Ante todo un cordial saludo, en adjunto encontrará los resultados de Laboratorios.<br><br>
        Paciente: <strong>${row.name}</strong><br>
        Ingreso: ${row.admission_date}`;

    await this.patienService.enviarCorreo(
      destinatario,
      asunto,
      contenido,
      file,
      outputPath,
    );

    return 'Correo enviado con éxito.';
  }

  @UseGuards(JwtUserGuard)
  @Get('/pdf/:id')
  async generatePdfFromHtmlOut(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const rowTmp = await this.patienService.getPatient(id);
    const row = JSON.parse(JSON.stringify(rowTmp));

    const pdfBuffer = await this.patienService.generatePdfFromHtmlOut(
      row.result_html,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="archivo.pdf"',
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  @Post()
  createPatient(@Body() newPatient: CreatePatientsDto) {
    return this.patienService.createPatient(newPatient);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updatePatient(
    @Param('id', ParseIntPipe) id: number,
    @Body() patient: UpdatePatientsDto,
  ) {
    return this.patienService.updatePatient(id, patient);
  }

  @UseGuards(JwtUserGuard)
  @Post('pdf')
  async generatePdf(
    @Body() body: { html: string },
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.patienService.generatePdfFromHtmlOut(body.html);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="reporte-laboratorio.pdf"',
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'no-store',
    });
    res.send(pdfBuffer);
  }
}

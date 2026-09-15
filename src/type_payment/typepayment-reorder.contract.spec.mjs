import fs from 'node:fs';
const controller = fs.readFileSync('src/type_payment/typepayment.controller.ts', 'utf8');
const service = fs.readFileSync('src/type_payment/typepayment.service.ts', 'utf8');
for (const token of ["@Patch('reorder')", "@RequirePermissions('typepayment.update')", 'typepaymentService.reorder']) {
  if (!controller.includes(token)) throw new Error('CONTROLLER_' + token);
}
for (const token of ['pessimistic_write', 'temporaryBase', 'TYPEPAYMENT_REORDER_SCOPE_INVALID', 'typepayment.reordered']) {
  if (!service.includes(token)) throw new Error('SERVICE_' + token);
}
console.log('[OK] Backend reorder aprobado.');

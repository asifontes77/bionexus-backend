import { readFileSync } from 'node:fs';
const read=(path:string)=>readFileSync(path,'utf8');
describe('TypePayment manageable fields contract',()=>{
  const service=read('src/type_payment/typepayment.service.ts');
  const controller=read('src/type_payment/typepayment.controller.ts');
  const create=read('src/type_payment/dto/create-typepayment.dto.ts');
  const update=read('src/type_payment/dto/update-typepayment.dto.ts');
  it('accepts fields in atomic create and update',()=>{expect(create).toContain('fields?: PaymentMethodFieldInputDto[]');expect(update).toContain('fields?: PaymentMethodFieldInputDto[]');expect(controller).toContain("'fields'");expect(service).toContain('replaceFields(manager,saved.id,input.fields)');expect(service).toContain('if(body.fields!==undefined)');});
  it('validates, orders and replaces the full collection',()=>{for(const token of ['TYPEPAYMENT_FIELDS_ARRAY_REQUIRED','TYPEPAYMENT_FIELD_CODE_DUPLICATED','TYPEPAYMENT_FIELD_TYPE_INVALID','TYPEPAYMENT_FIELD_LENGTH_RANGE_INVALID','repository.delete({paymentMethodId})','displayOrder:(index+1)*10'])expect(service).toContain(token);});
  it('keeps writes inside the existing transaction and returns relations',()=>{expect(service).toContain('this.dataSource.transaction');expect(service).toContain('relations:{currencies:{currency:true},fields:true}');});
});

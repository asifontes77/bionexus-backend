import { PatientAdmissionCloseValidator } from './patient-admission-close.validator';
describe('PatientAdmissionCloseValidator',()=>{
  const validator=new PatientAdmissionCloseValidator();
  const valid=()=>({clientId:1,tariffId:2,patient:{name:'Paciente',age:30,ageUnit:'Años',sex:false,sample:'Tomada aquí'},exams:[{examCatalogId:7}],payments:[{typePaymentId:1,amount:10,currency:'BASE' as const}]});
  it('normaliza un cierre valido',()=>expect(validator.normalize(valid())).toMatchObject({clientId:1,tariffId:2,exams:[{examCatalogId:7,quantity:1}],payments:[{amount:10,currency:'BASE'}]}));
  it('rechaza examenes vacios',()=>expect(()=>validator.normalize({...valid(),exams:[]})).toThrow('PATIENT_ADMISSION_CLOSE_EXAMS_REQUIRED'));
  it('rechaza examen duplicado',()=>expect(()=>validator.normalize({...valid(),exams:[{examCatalogId:7},{examCatalogId:7}]})).toThrow('PATIENT_ADMISSION_CLOSE_EXAM_DUPLICATED'));
  it('rechaza pago vacio',()=>expect(()=>validator.normalize({...valid(),payments:[]})).toThrow('PATIENT_ADMISSION_CLOSE_PAYMENTS_REQUIRED'));
  it('rechaza monto no positivo',()=>expect(()=>validator.normalize({...valid(),payments:[{typePaymentId:1,amount:0,currency:'BASE'}]})).toThrow('PATIENT_ADMISSION_CLOSE_PAYMENT_AMOUNT_INVALID'));
  it('rechaza moneda desconocida',()=>expect(()=>validator.normalize({...valid(),payments:[{typePaymentId:1,amount:10,currency:'OTRA' as never}]})).toThrow('PATIENT_ADMISSION_CLOSE_PAYMENT_CURRENCY_INVALID'));
});

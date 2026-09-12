import { PatientAdmissionCloseCalculator } from './patient-admission-close-calculator';
describe('PatientAdmissionCloseCalculator',()=>{const service=new PatientAdmissionCloseCalculator();
it('calcula subtotal impuesto y total',()=>expect(service.calculateExams([{examCatalogId:1,quantity:2,unitPrice:10,taxRate:16}])[0]).toMatchObject({subtotal:20,taxTotal:3.2,total:23.2}));
it('convierte pago local a moneda base',()=>expect(service.calculatePayments([{typePaymentId:1,currency:'LOCAL',currencyId:1,amount:464,description1:'',description2:''}],20)[0]).toMatchObject({baseAmount:23.2,localAmount:464}));
it('acepta cierre exactamente pagado',()=>expect(service.summarize([{examCatalogId:1,quantity:1,unitPrice:10,subtotal:10,taxRate:0,taxTotal:0,total:10}],[{typePaymentId:1,currency:'BASE',currencyId:2,enteredAmount:10,baseAmount:10,localAmount:200,description1:'',description2:''}])).toMatchObject({total:10,paid:10,balance:0}));
it('rechaza saldo pendiente',()=>expect(()=>service.summarize([{examCatalogId:1,quantity:1,unitPrice:10,subtotal:10,taxRate:0,taxTotal:0,total:10}],[])).toThrow('PATIENT_ADMISSION_CLOSE_BALANCE_PENDING'));
it('rechaza tasa cambiaria invalida',()=>expect(()=>service.calculatePayments([{typePaymentId:1,currency:'LOCAL',currencyId:1,amount:10,description1:'',description2:''}],0)).toThrow('PATIENT_ADMISSION_CLOSE_EXCHANGE_RATE_INVALID'));
it('redondea cada resultado a dos decimales',()=>expect(service.calculateExams([{examCatalogId:1,quantity:3,unitPrice:0.1,taxRate:16}])[0]).toMatchObject({subtotal:0.3,taxTotal:0.05,total:0.35}));});

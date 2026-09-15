import { PatientAdmissionCloseCatalogResolver } from './patient-admission-close-catalog.resolver';

describe('PatientAdmissionCloseCatalogResolver normalized',()=>{
  const resolver=new PatientAdmissionCloseCatalogResolver();
  const input=()=>({clientId:1,tariffId:2,patient:{name:'Paciente',age:30,ageUnit:'Anios',sex:false,sample:'Tomada aqui'},exams:[{examCatalogId:7,quantity:1}],payments:[{typePaymentId:3,amount:10,currency:'BASE' as const,fieldValues:[{fieldId:11,value:'REF',bankId:null}]}]});
  const type=(overrides:any={})=>({id:3,annulled:false,currencies:[{currencyId:2,isActive:true,currency:{code:'USD',isActive:true}}],fields:[{id:11,code:'reference',label:'Referencia',fieldType:'reference',isActive:true,isRequired:true,displayOrder:10,minLength:null,maxLength:50,validationPattern:null}],...overrides});
  function manager(options:any={}){const values:any={Client:options.client??{id:1,tariff_id:null},Tariff:options.tariff??{id:2,isActive:true},Examlists:options.exams??[{id:7,description:'Hemograma',group_id:1,position:1,tax_id:1}],ExamTariffPrice:options.prices??[{examCatalogId:7,tariffId:2,price:10,isActive:true}],Tax:options.taxes??[{id:1,description:'IVA',value:16}],TypePayment:options.types??[type()]};return{getRepository:(entity:any)=>({findOne:jest.fn(async()=>values[entity.name]),find:jest.fn(async()=>values[entity.name])})} as never;}
  it('resuelve forma activa y moneda permitida',async()=>expect(resolver.resolve(manager(),input() as never)).resolves.toMatchObject({payments:[{typePaymentId:3,currencyId:2}]}));
  it('rechaza forma inactiva',async()=>expect(resolver.resolve(manager({types:[type({annulled:true})]}),input() as never)).rejects.toThrow('PATIENT_ADMISSION_CLOSE_PAYMENT_TYPE_INACTIVE'));
  it('rechaza moneda no permitida',async()=>expect(resolver.resolve(manager({types:[type({currencies:[{currencyId:1,isActive:true,currency:{code:'VES',isActive:true}}]})]}),input() as never)).rejects.toThrow('PATIENT_ADMISSION_CLOSE_PAYMENT_CURRENCY_NOT_ALLOWED'));
  it('exige primer campo configurable requerido',async()=>{const value=input();value.payments[0].fieldValues[0].value='';await expect(resolver.resolve(manager(),value as never)).rejects.toThrow('PATIENT_ADMISSION_CLOSE_PAYMENT_FIELD_REQUIRED');});
});

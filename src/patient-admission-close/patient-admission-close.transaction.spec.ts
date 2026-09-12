import { PatientAdmissionCloseTransaction } from './patient-admission-close.transaction';
describe('PatientAdmissionCloseTransaction',()=>{
  it('ejecuta todo bajo SERIALIZABLE',async()=>{const manager={};const transaction=jest.fn(async(level,work)=>work(manager));const boundary=new PatientAdmissionCloseTransaction({transaction} as never);await expect(boundary.execute(async current=>current)).resolves.toBe(manager);expect(transaction).toHaveBeenCalledWith('SERIALIZABLE',expect.any(Function));});
  it('propaga el error para que TypeORM ejecute rollback',async()=>{const failure=new Error('ROLLBACK_EXPECTED');const transaction=jest.fn(async(_level,work)=>work({}));const boundary=new PatientAdmissionCloseTransaction({transaction} as never);await expect(boundary.execute(async()=>{throw failure;})).rejects.toBe(failure);});
  it('no captura ni convierte errores de dominio',async()=>{const transaction=jest.fn(async(_level,work)=>work({}));const boundary=new PatientAdmissionCloseTransaction({transaction} as never);await expect(boundary.execute(async()=>Promise.reject(new Error('DOMAIN_ERROR')))).rejects.toThrow('DOMAIN_ERROR');});
  it('rechaza trabajo inexistente',async()=>{const boundary=new PatientAdmissionCloseTransaction({transaction:jest.fn()} as never);expect(()=>boundary.execute(null as never)).toThrow('PATIENT_ADMISSION_CLOSE_WORK_REQUIRED');});
});

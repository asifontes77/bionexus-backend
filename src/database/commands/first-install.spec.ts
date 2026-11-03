import { assertSafeDatabaseName, serializeInstallError } from './first-install';
describe('first-install platform scope',()=>{
  it('admite bionexus y nombres temporales controlados',()=>{expect(assertSafeDatabaseName('bionexus')).toBe('bionexus');expect(assertSafeDatabaseName('bionexus_test_20261103')).toBe('bionexus_test_20261103');});
  it('rechaza bases fuera del alcance Bio Nexus',()=>{expect(()=>assertSafeDatabaseName('postgres')).toThrow('UNSAFE_INSTALL_DATABASE');expect(()=>assertSafeDatabaseName('otra_base')).toThrow('UNSAFE_INSTALL_DATABASE');});
  it('serializa el error completo y su causa',()=>{const cause=Object.assign(new Error('inner'),{code:'23505',detail:'duplicate',constraint:'uq_test'});expect(serializeInstallError(Object.assign(new Error('outer'),{cause}))).toMatchObject({message:'outer',cause:{message:'inner',code:'23505',detail:'duplicate',constraint:'uq_test'}});});
});

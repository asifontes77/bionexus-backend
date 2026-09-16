import { readFileSync } from 'node:fs';
const read=(path:string)=>readFileSync(path,'utf8');
describe('Sample type status contract',()=>{
  const entity=read('src/sample_type/sampletype.entity.ts');
  const dto=read('src/sample_type/dto/update-sampletype.dto.ts');
  const controller=read('src/sample_type/sampletype.controller.ts');
  const service=read('src/sample_type/sampletype.service.ts');
  const migration=read('src/database/migrations/1789345200000-SampleTypeStatus.ts');
  it('agrega estado seguro y conserva existentes activos',()=>{expect(entity).toContain('annulled: boolean');expect(dto).toContain('annulled?: boolean');expect(migration).toContain('DEFAULT 0');expect(migration).toContain('sample-types.change-status');});
  it('separa permisos de contenido y estado',()=>{expect(controller).toContain("permissions.push('sample-types.update')");expect(controller).toContain("permissions.push('sample-types.change-status')");expect(controller).toContain("AuthorizationService");expect(controller).toContain("authorizationService.hasAllPermissions");});
  it('audita activar e inactivar sin eliminar',()=>{expect(service).toContain('sample-types.deactivated');expect(service).toContain('sample-types.activated');expect(service).not.toContain('repository.remove');});
});

import { PlatformProvisioningService } from './platform-provisioning.service';
describe('PlatformProvisioningService',()=>{
 it('uses one serializable transaction for laboratory and main branch',async()=>{
  const manager={query:jest.fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{rif:false,username:false}])
      .mockResolvedValueOnce([{id:1,rif:'J-12345678-9',name:'Lab'}])
      .mockResolvedValueOnce([{id:2,code:'MAIN',name:'Principal'}])
      .mockResolvedValueOnce([{id:1}])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{id:3}])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{id:4,name:'Admin',username:'admin'}])
      .mockResolvedValueOnce(undefined)};
  const dataSource={transaction:jest.fn(async(_level,work)=>work(manager))};
  const service=new PlatformProvisioningService(dataSource as never);
  await expect(service.provision({rif:'J-12345678-9',name:'Lab',businessName:'Lab CA',address:'Caracas',branchCode:'MAIN',branchName:'Principal',administratorName:'Admin',administratorUsername:'admin',administratorPassword:'Strong!Pass123'})).resolves.toEqual(expect.objectContaining({laboratory:expect.objectContaining({id:1}),mainBranch:expect.objectContaining({id:2})}));
  expect(dataSource.transaction).toHaveBeenCalledWith('SERIALIZABLE',expect.any(Function));
  expect(manager.query.mock.calls.some(call=>String(call[0]).includes('laboratory_branches'))).toBe(true);
 });
 it('rejects an incomplete password before opening a transaction',async()=>{const dataSource={transaction:jest.fn()};const service=new PlatformProvisioningService(dataSource as never);await expect(service.provision({} as never)).rejects.toThrow();expect(dataSource.transaction).not.toHaveBeenCalled();});

});

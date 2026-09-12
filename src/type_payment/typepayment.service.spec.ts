import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TypePaymentService } from './typepayment.service';

describe('TypePaymentService normalized',()=>{
  const manager:any={getRepository:jest.fn()};
  const repository:any={manager,find:jest.fn(),findOne:jest.fn()};
  let service:TypePaymentService;
  beforeEach(()=>{jest.clearAllMocks();service=new TypePaymentService(repository);});
  it('lista relaciones normalizadas por orden',async()=>{repository.find.mockResolvedValue([]);await service.getTypepayments();expect(repository.find).toHaveBeenCalledWith({relations:{currencies:{currency:true},fields:true},order:{displayOrder:'ASC',description:'ASC'}});});
  it('rechaza id invalido',async()=>{await expect(service.getTypepayment(0)).rejects.toBeInstanceOf(BadRequestException);});
  it('rechaza registro inexistente',async()=>{repository.findOne.mockResolvedValue(null);await expect(service.getTypepayment(8)).rejects.toBeInstanceOf(NotFoundException);});
  it('consulta detalle con monedas y campos',async()=>{repository.findOne.mockResolvedValue({id:1});await service.getTypepayment(1);expect(repository.findOne).toHaveBeenCalledWith({where:{id:1},relations:{currencies:{currency:true},fields:true}});});
  it('rechaza update vacio',async()=>{await expect(service.updateTypepayment(1,{})).rejects.toMatchObject({response:{message:'TYPEPAYMENT_UPDATE_REQUIRED'}});});
});

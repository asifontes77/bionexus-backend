import { readFileSync } from "node:fs";
const read = (file: string) => readFileSync(file, "utf8");
describe("Germs hardened backend contract", () => {
  const controller = read("src/list_germs/list_germs.controller.ts");
  const service = read("src/list_germs/list_germs.service.ts");
  const migration = read("src/database/migrations/1788487200000-GermPermissions.ts");
  it("preserva la ruta publica y separa permisos", () => {
    expect(controller).toContain("@Controller('list-germs')");
    for (const code of ["germs.read","germs.create","germs.update","germs.change-status"]) expect(controller + migration).toContain(code);
  });
  it("preserva historial sin eliminacion fisica", () => {
    expect(controller).not.toContain("@Delete");
    expect(service).not.toContain("deleteGerm");
    expect(service).toContain("GERM_GERMEN_ALREADY_EXISTS");
  });
  it("audita altas cambios y estados", () => {
    for (const action of ["germ.created","germ.updated","germ.activated","germ.deactivated"]) expect(service).toContain(action);
  });
});

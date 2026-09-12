import fs from "node:fs";
import path from "node:path";
const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),"utf8");
const controller=read("src/tariffs/tariffs.controller.ts");
const service=read("src/tariffs/tariffs.service.ts");
for(const token of ["@Patch('reorder')","@RequirePermissions('tariffs.update')","return this.service.reorder"]){if(!controller.includes(token))throw new Error("TARIFF_REORDER_CONTROLLER_"+token);}
for(const token of ["async reorder(idsValue: unknown","setLock('pessimistic_write')","const temporaryPositionBase =","row.position = temporaryPositionBase + index","row.position = index + 1","TARIFF_REORDER_SCOPE_INVALID","tariffs.reordered"]){if(!service.includes(token))throw new Error("TARIFF_REORDER_SERVICE_"+token);}
if(service.includes("row.position = -(index + 1)"))throw new Error("TARIFF_REORDER_NEGATIVE_TEMP_POSITION");
console.log("[OK] Reordenamiento usa posiciones temporales positivas compatibles con CK_tariffs_position.");

export class SaveDocumentDraftDto {
  laboratoryId: number;
  documentType: string;
  schemaVersion: number;
  documentJson: Record<string, unknown>;
  sourceVersionId?: number | null;
}
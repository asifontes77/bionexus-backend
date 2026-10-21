/** Payload used to create a document definition. */
export class CreateDocumentDefinitionDto {
  /** Owning laboratory identifier. */
  laboratoryId: number;
  /** Functional document type. */
  documentType: string;
  /** User-facing document name. */
  name: string;
  /** Optional user-facing description. */
  description?: string | null;
}
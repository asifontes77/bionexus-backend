/** Payload used to update editable document definition fields. */
export class UpdateDocumentDefinitionDto {
  /** User-facing document name. */
  name?: string;
  /** Optional user-facing description. */
  description?: string | null;
}
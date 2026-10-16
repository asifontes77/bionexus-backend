export class PublishDocumentVersionDto {
  laboratoryId: number;
  documentType: string;
  publicationComment?: string | null;
  activate?: boolean;
}
export interface ObjectReference {
  readonly inventoryNumber: string;
  readonly otherNumber: string | null;
  readonly numberOfObjects: number;
  readonly displayTitle: string | null;
  readonly objectName: string | null;
  readonly briefDescriptionSnapshot: string | null;
}

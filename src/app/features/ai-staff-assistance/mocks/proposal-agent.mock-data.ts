import { UseType } from '@shared/models/collection-use-status.model';
import { ObjectReference } from '@shared/models/object-reference.model';

import { DocumentSearchMatch } from '../models/assistance.model';

export interface AssistanceCatalogDocument {
  readonly documentId: string;
  readonly fileName: string;
  readonly type: string;
  readonly useTypes: readonly UseType[];
  readonly keywords: readonly string[];
  readonly reason: string;
}

export interface AssistanceObjectIndexItem extends ObjectReference {
  readonly keywords: readonly string[];
}

export const ASSISTANCE_CATALOG_DOCUMENTS: readonly AssistanceCatalogDocument[] = [
  {
    documentId: 'catalog-doc-exhibition-loan-conditions',
    fileName: 'exhibition-loan-conditions.pdf',
    type: 'ASSISTANCE_GUIDE',
    useTypes: ['EXHIBITION'],
    keywords: ['exhibition', 'display', 'public', 'loan', 'education'],
    reason: 'Exhibition requests usually need display, loan, handling, and public-use conditions.',
  },
  {
    documentId: 'catalog-doc-exhibition-object-checklist',
    fileName: 'exhibition-object-checklist.xlsx',
    type: 'ASSISTANCE_TEMPLATE',
    useTypes: ['EXHIBITION'],
    keywords: ['exhibition', 'object', 'display', 'checklist'],
    reason: 'The request may require a structured object checklist for exhibition review.',
  },
  {
    documentId: 'catalog-doc-in-situ-access-guidelines',
    fileName: 'in-situ-access-guidelines.pdf',
    type: 'ASSISTANCE_GUIDE',
    useTypes: ['IN_SITU_VISIT'],
    keywords: ['access', 'visit', 'research', 'consultation', 'catalogue', 'notebook'],
    reason: 'In-situ visits usually need reading-room or collection-access guidance.',
  },
  {
    documentId: 'catalog-doc-research-visit-request-form',
    fileName: 'research-visit-request-form.docx',
    type: 'ASSISTANCE_TEMPLATE',
    useTypes: ['IN_SITU_VISIT'],
    keywords: ['research', 'study', 'catalogue', 'field', 'records'],
    reason: 'The request mentions research-like access that may require a visit form.',
  },
  {
    documentId: 'catalog-doc-other-use-review-notes',
    fileName: 'other-use-review-notes.pdf',
    type: 'ASSISTANCE_GUIDE',
    useTypes: ['OTHER'],
    keywords: ['other', 'general', 'unclear', 'mixed'],
    reason: 'Unclear or mixed requests should be reviewed with the general-use guidance.',
  },
];

export const ASSISTANCE_OBJECT_INDEX: readonly AssistanceObjectIndexItem[] = [
  {
    inventoryNumber: 'INV-ZOO-1892-001',
    displayTitle: 'Atlantic forest mammal specimen catalogue',
    objectName: 'Specimen catalogue',
    briefDescriptionSnapshot:
      'Bound catalogue documenting Atlantic forest mammal specimens collected in 1892.',
    keywords: ['zoology', 'atlantic', 'forest', 'mammal', 'specimen', 'catalogue', '1892'],
  },
  {
    inventoryNumber: 'INV-ZOO-1892-002',
    displayTitle: 'Field notebook from Atlantic forest survey',
    objectName: 'Field notebook',
    briefDescriptionSnapshot:
      'Notebook with collecting routes, species notes, and specimen references.',
    keywords: ['zoology', 'atlantic', 'forest', 'field', 'notebook', 'survey', 'species'],
  },
  {
    inventoryNumber: 'INV-HIST-LAB-004',
    displayTitle: 'Early laboratory microscope',
    objectName: 'Microscope',
    briefDescriptionSnapshot:
      'Laboratory instrument used in public demonstrations of experimental practice.',
    keywords: ['laboratory', 'instrument', 'microscope', 'exhibition', 'science', 'history'],
  },
  {
    inventoryNumber: 'INV-HIST-LAB-009',
    displayTitle: 'Glassware set for chemistry demonstration',
    objectName: 'Laboratory glassware',
    briefDescriptionSnapshot: 'Glassware set associated with early teaching demonstrations.',
    keywords: ['laboratory', 'instrument', 'glassware', 'chemistry', 'education', 'exhibition'],
  },
  {
    inventoryNumber: 'INV-PHOTO-PORT-1930',
    displayTitle: 'Rio de Janeiro port photographic album',
    objectName: 'Photographic album',
    briefDescriptionSnapshot:
      'Album containing photographs of Rio de Janeiro port infrastructure, 1890-1930.',
    keywords: ['photography', 'photo', 'port', 'rio', 'janeiro', 'album', '1930'],
  },
  {
    inventoryNumber: 'INV-BOT-HERB-021',
    displayTitle: 'Medicinal plant herbarium sheet set',
    objectName: 'Herbarium sheets',
    briefDescriptionSnapshot:
      'Set of botanical herbarium records documenting medicinal plant collections.',
    keywords: ['botanical', 'herbarium', 'plant', 'medicinal', 'records', 'classification'],
  },
];

export function toCatalogDocumentMatch(document: AssistanceCatalogDocument): DocumentSearchMatch {
  return {
    documentId: document.documentId,
    fileName: document.fileName,
    type: document.type,
    source: 'ASSISTANCE_CATALOG',
    reason: document.reason,
  };
}

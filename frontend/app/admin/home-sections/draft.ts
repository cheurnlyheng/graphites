import type { AdminHomeSectionResponse, HomeSectionType } from '@/lib/types';

export interface PanelDraft {
  imageUrl: string;
  title: string;
  description: string;
}

/** The editor's working copy of a block. Only the fields for its `type` are used. */
export interface Draft {
  id: string | null; // null while creating a new block
  type: HomeSectionType;
  active: boolean;
  title: string; // product row title, or hero header
  description: string;
  imageUrl: string;
  buttonText: string;
  buttonLink: string;
  panels: PanelDraft[]; // split banner: [left, right]
  productIds: string[];
}

export const TYPE_LABELS: Record<HomeSectionType, string> = {
  PRODUCTS: 'Product row',
  HERO: 'Hero banner',
  SPLIT_BANNER: 'Split banner',
  HANGING_RAIL: 'Hanging rail'
};

const emptyPanel = (): PanelDraft => ({ imageUrl: '', title: '', description: '' });

export function newDraft(type: HomeSectionType): Draft {
  return {
    id: null,
    type,
    active: true,
    title: '',
    description: '',
    imageUrl: '',
    buttonText: type === 'HERO' ? 'Shop the collection' : '',
    buttonLink: type === 'HERO' ? '/products' : '',
    panels: [emptyPanel(), emptyPanel()],
    productIds: []
  };
}

export function draftFromSection(s: AdminHomeSectionResponse): Draft {
  const panels = s.panels.map((p) => ({ imageUrl: p.imageUrl, title: p.title, description: p.description ?? '' }));
  return {
    id: s.id,
    type: s.type,
    active: s.active,
    title: s.title,
    description: s.description ?? '',
    imageUrl: s.imageUrl ?? '',
    buttonText: s.buttonText ?? '',
    buttonLink: s.buttonLink ?? '',
    panels: panels.length === 2 ? panels : [emptyPanel(), emptyPanel()],
    productIds: s.products.map((p) => p.id)
  };
}

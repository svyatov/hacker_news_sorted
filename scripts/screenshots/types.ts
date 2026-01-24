import type { SortVariant } from '~app/types';

export type VariantConfig = {
  sort: SortVariant;
  title: string;
  titleNote?: string;
  subtitle: string;
  filename: string;
  showNewPosts?: boolean;
  hideArrow?: boolean;
};

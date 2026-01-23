import type { SortVariant } from '~app/types';

export type VariantConfig = {
  sort: SortVariant;
  title: string;
  subtitle: string;
  filename: string;
  forceCompact?: boolean;
};

import type { ReactElement } from 'react';

import { CSS_CLASSES } from '~app/constants';
import type { SortOption, SortVariant } from '~app/types';

type SortButtonProps = {
  sortOption: SortOption;
  activeSort: SortVariant;
  onSort: (sortBy: SortVariant) => void;
};

const SortButton = ({ sortOption, activeSort, onSort }: SortButtonProps): ReactElement => {
  const { sortBy, text, shortcut } = sortOption;
  const isActive = activeSort === sortBy;
  const cssClasses = `${CSS_CLASSES.BTN}${isActive ? ` ${CSS_CLASSES.ACTIVE}` : ''}`;

  return (
    <button
      type="button"
      onClick={() => !isActive && onSort(sortBy)}
      className={cssClasses}
      data-sort={sortBy}
      aria-pressed={isActive}
      title={sortBy === 'default' ? 'Original sort order' : `Sort by ${sortBy}`}>
      <span className={CSS_CLASSES.BTN_TEXT}>{text}</span>
      <span className={CSS_CLASSES.BTN_SHORTCUT}>{shortcut}</span>
    </button>
  );
};

export default SortButton;

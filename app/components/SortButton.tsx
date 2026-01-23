import { useCallback, type ReactElement } from 'react';

import { CSS_CLASSES } from '~app/constants';
import type { SortOption, SortVariant } from '~app/types';
import { setLastActiveSort } from '~app/utils/storage';

type ControlPanelButtonProps = {
  sortOption: SortOption;
  activeSort: SortVariant;
  setActiveSort: (sortBy: SortVariant) => void;
};

const SortButton = ({ sortOption, activeSort, setActiveSort }: ControlPanelButtonProps): ReactElement => {
  const { sortBy, text, shortcut } = sortOption;
  const isActive = activeSort === sortBy;
  const cssClasses = `${CSS_CLASSES.BTN}${isActive ? ` ${CSS_CLASSES.ACTIVE}` : ''}`;

  const updateActiveSort = useCallback(() => {
    if (isActive) return;
    setActiveSort(sortBy);
    setLastActiveSort(sortBy);
  }, [sortBy, isActive, setActiveSort]);

  return (
    <button
      type="button"
      onClick={updateActiveSort}
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

import { useCallback, type ReactElement } from 'react';

import { HNS_CLASSES } from '~app/constants';
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
  const cssClasses = `${HNS_CLASSES.BTN}${isActive ? ` ${HNS_CLASSES.ACTIVE}` : ''}`;

  const updateActiveSort = useCallback(() => {
    if (isActive) return;
    setActiveSort(sortBy);
    setLastActiveSort(sortBy);
  }, [sortBy, isActive, setActiveSort]);

  return (
    <span
      onClick={updateActiveSort}
      className={cssClasses}
      data-sort={sortBy}
      title={sortBy === 'default' ? 'Original sort order' : `Sort by ${sortBy}`}>
      <span className={HNS_CLASSES.BTN_TEXT}>{text}</span>
      <span className={HNS_CLASSES.BTN_SHORTCUT}>{shortcut}</span>
    </span>
  );
};

export default SortButton;

import { useCallback, type ReactElement } from 'react';

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
  const cssClasses = `hns-btn${isActive ? ' hns-active' : ''}`;

  const updateActiveSort = useCallback(() => {
    if (isActive) return;
    setActiveSort(sortBy);
    setLastActiveSort(sortBy);
  }, [sortBy, isActive, setActiveSort]);

  return (
    <span
      onClick={updateActiveSort}
      className={cssClasses}
      title={sortBy === 'default' ? 'Original sort order' : `Sort by ${sortBy}`}>
      <span className="hns-btn-text">{text}</span>
      <span className="hns-btn-shortcut">{shortcut}</span>
    </span>
  );
};

export default SortButton;

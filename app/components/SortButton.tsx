import clsx from 'clsx';
import { useCallback, type ReactElement } from 'react';

import type { SortVariant } from '~app/types';
import { setLastActiveSort } from '~app/utils/storage';

type ControlPanelButtonProps = {
  sortBy: SortVariant;
  activeSort: SortVariant;
  setActiveSort: (sortBy: SortVariant) => void;
  text: string;
  shortcut: string;
};

const SortButton = ({ sortBy, activeSort, setActiveSort, text, shortcut }: ControlPanelButtonProps): ReactElement => {
  const isActive = activeSort === sortBy;
  const defaultSort = sortBy === 'default';

  const updateActiveSort = useCallback(() => {
    if (isActive) return;
    setActiveSort(sortBy);
    setLastActiveSort(sortBy);
  }, [sortBy, isActive]);

  return (
    <span
      onClick={updateActiveSort}
      className={clsx('hns-btn', isActive && 'hns-active')}
      title={defaultSort ? 'Original sort order' : `Sort by ${sortBy}`}>
      <span className="hns-btn-text">{text}</span>
      <span className="hns-btn-shortcut">{shortcut}</span>
    </span>
  );
};

export default SortButton;

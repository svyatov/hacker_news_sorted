import clsx from 'clsx';
import { useCallback, type ReactElement, type ReactNode } from 'react';

import type { SortVariant } from '~app/types';
import { setLastActiveSort } from '~app/utils/storage';

type ControlPanelButtonProps = {
  sortBy: SortVariant;
  activeSort: SortVariant;
  setActiveSort: (sortBy: SortVariant) => void;
  children: ReactNode;
};

const SortButton = ({ sortBy, activeSort, setActiveSort, children }: ControlPanelButtonProps): ReactElement => {
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
      {children}
    </span>
  );
};

export default SortButton;

import { Fragment, useEffect, useState, type ReactElement } from 'react';

import SortButton from '~app/components/SortButton';
import { useParsedRows } from '~app/hooks/useParsedRows';
import type { SortVariant } from '~app/types';
import { updateTable } from '~app/utils/presenters';
import { sortRows } from '~app/utils/sorters';
import { getLastActiveSort } from '~app/utils/storage';

const ControlPanel = (): ReactElement => {
  const lastActiveSort = getLastActiveSort();
  const [activeSort, setActiveSort] = useState<SortVariant>(lastActiveSort);
  const { parsedRows, footerRows } = useParsedRows();
  const sortButtonProps = { activeSort, setActiveSort };
  const sortOptions: { sortBy: SortVariant; text: string }[] = [
    { sortBy: 'points', text: 'Points' },
    { sortBy: 'time', text: 'Time' },
    { sortBy: 'comments', text: 'Comments' },
    { sortBy: 'default', text: 'Original' },
  ];

  useEffect(() => {
    updateTable(sortRows(parsedRows, activeSort), footerRows);
  }, [activeSort, parsedRows]);

  return (
    <>
      <span className="hns-sort-by-label">Sort By:</span>

      {sortOptions.map((option, index) => (
        <Fragment key={option.sortBy}>
          <SortButton sortBy={option.sortBy} {...sortButtonProps}>
            {option.text}
          </SortButton>
          {index < sortOptions.length - 1 && ' · '}
        </Fragment>
      ))}

      <span className="hns-divider">|</span>
    </>
  );
};

export default ControlPanel;

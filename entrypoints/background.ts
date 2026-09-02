import { defineBackground } from '#imports';

import { initBadge } from '~app/utils/badge';

// Thin shell (U4, R10): the badge logic lives in ~app/utils/badge so it stays unit-testable.
export default defineBackground(() => initBadge());

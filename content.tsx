import type { PlasmoCSConfig, PlasmoCSUIJSXContainer, PlasmoRender } from 'plasmo';
import { createRoot } from 'react-dom/client';

import ControlPanel from '~app/components/ControlPanel';
import { CONTROL_PANEL_ROOT_ID } from '~app/constants';
import { getControlPanelParentElement } from '~app/utils/selectors';

export const config: PlasmoCSConfig = {
  matches: ['*://news.ycombinator.com/*'],
  css: ['content.css'],
};

const injectRootElement = (parentElement: HTMLElement): HTMLElement => {
  const controlPanelRoot = document.createElement('span');
  controlPanelRoot.id = CONTROL_PANEL_ROOT_ID;
  parentElement.prepend(controlPanelRoot);
  return controlPanelRoot;
};

// https://docs.plasmo.com/framework/content-scripts-ui/life-cycle#custom-root-container
export const getRootContainer = () =>
  new Promise<HTMLElement>((resolve) => {
    const existingElement = getControlPanelParentElement();

    if (existingElement) {
      resolve(injectRootElement(existingElement));
    }

    const observer = new MutationObserver(() => {
      const controlPanelParentElement = getControlPanelParentElement();
      if (!controlPanelParentElement) return;

      observer.disconnect();
      resolve(injectRootElement(controlPanelParentElement));
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });

export const render: PlasmoRender<PlasmoCSUIJSXContainer> = async ({ createRootContainer }) => {
  const rootContainer = await createRootContainer();
  createRoot(rootContainer).render(<ControlPanel />);
};

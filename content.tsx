import type { PlasmoCSConfig, PlasmoCSUIJSXContainer, PlasmoRender } from 'plasmo';
import { createRoot } from 'react-dom/client';

import ControlPanel from '~app/components/ControlPanel';
import { CONTROL_PANEL_ROOT_ID, SETTINGS_KEYS } from '~app/constants';
import { getControlPanelParentElement, getTableBody } from '~app/utils/selectors';

export const config: PlasmoCSConfig = {
  matches: ['*://news.ycombinator.com/*'],
  css: ['content.css'],
};

const LAYOUT_TIMEOUT_MS = 3000;

const setLayoutStatus = (ok: boolean) => {
  chrome.storage.sync.set({ [SETTINGS_KEYS.LAYOUT_OK]: ok });
};

const injectRootElement = (parentElement: HTMLElement): HTMLElement => {
  const controlPanelRoot = document.createElement('span');
  controlPanelRoot.id = CONTROL_PANEL_ROOT_ID;
  parentElement.prepend(controlPanelRoot);
  return controlPanelRoot;
};

const verifyAndInject = (parent: HTMLElement, resolve: (el: HTMLElement) => void): boolean => {
  if (!getTableBody()) {
    setLayoutStatus(false);
    return false;
  }
  setLayoutStatus(true);
  resolve(injectRootElement(parent));
  return true;
};

// https://docs.plasmo.com/framework/content-scripts-ui/life-cycle#custom-root-container
export const getRootContainer = () =>
  new Promise<HTMLElement>((resolve) => {
    const existingElement = getControlPanelParentElement();

    if (existingElement) {
      verifyAndInject(existingElement, resolve);
      return;
    }

    const observer = new MutationObserver(() => {
      const controlPanelParentElement = getControlPanelParentElement();
      if (!controlPanelParentElement) return;

      observer.disconnect();
      verifyAndInject(controlPanelParentElement, resolve);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      setLayoutStatus(false);
      // Don't resolve — control panel never renders
    }, LAYOUT_TIMEOUT_MS);
  });

export const render: PlasmoRender<PlasmoCSUIJSXContainer> = async ({ createRootContainer }) => {
  const rootContainer = await createRootContainer();
  createRoot(rootContainer).render(<ControlPanel />);
};

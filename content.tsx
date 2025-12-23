import type {
  PlasmoCSConfig,
  PlasmoCSUIJSXContainer,
  PlasmoRender,
} from 'plasmo'
import { createRoot } from 'react-dom/client'

import ControlPanel from '~app/components/ControlPanel'
import { CONTROL_PANEL_ROOT_ID } from '~app/constants'
import { getControlPanelParentElement } from '~app/utils/selectors'

export const config: PlasmoCSConfig = {
  matches: ['*://news.ycombinator.com/*'],
  css: ['content.css'],
}

export const getRootContainer = () =>
  new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const controlPanelParentElement =
        getControlPanelParentElement()
      if (!controlPanelParentElement) return

      clearInterval(checkInterval)

      const controlPanelRoot =
        document.createElement('span')
      controlPanelRoot.id = CONTROL_PANEL_ROOT_ID

      controlPanelParentElement.prepend(
        controlPanelRoot,
      )
      resolve(controlPanelRoot)
    }, 155)
  })

export const render: PlasmoRender<
  PlasmoCSUIJSXContainer
> = async ({ createRootContainer }) => {
  const rootContainer =
    await createRootContainer()
  createRoot(rootContainer).render(
    <ControlPanel />,
  )
}

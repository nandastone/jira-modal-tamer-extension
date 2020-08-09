import interact from 'interactjs'
import dragIndicatorSvg from './assets/drag_indicator-black-24dp.svg'

// @todo Split file up on logical bounds.
// @todo Automatically bundle for App Store as part of build.

const EXTENSION_PREFIX = 'jmt'

/**
 * Look for the presence of a JIRA dialog (modal) based on a node. We try to find
 * the dialog a variety of ways, taking legacy vs new JIRA modals into account.
 */
const getDialogFromNode = (node) => {
  let result = { dialog: null, legacy: null }

  if (!node.tagName) {
    return result
  }

  const descendant = node.querySelector('[role="dialog"], .jira-dialog')
  const ascendant = node.closest('[role="dialog"], .jira-dialog')

  if (node.attributes.role === 'dialog' || node.classList.contains('jira-dialog')) {
    result = { ...result, dialog: node }
  } else if (descendant) {
    result = { ...result, dialog: descendant }
  } else if (ascendant) {
    result = { ...result, dialog: ascendant }
  }

  if (result.dialog) {
    const legacy = result.dialog.classList.contains('jira-dialog')
    result = { ...result, legacy }
  }

  return result
}

/**
 * Look for the presence of a JIRA dialog in a list of nodes.
 * @see getDialogFromNode
 */
const getDialogFromNodeList = (nodeList) => {
  let result = { dialog: null, legacy: null }

  if (!nodeList.length) {
    return result
  }

  for (const node of nodeList) {
    const { dialog, legacy } = getDialogFromNode(node)

    if (dialog) {
      result = { dialog, legacy }
      break
    }
  }

  return result
}

const addDraggable = (dialogEl, legacy = false) => {
  dialogEl.attributes.draggable = true
  dialogEl.style.touchAction = 'none'
  dialogEl.style.transition = 'opacity 0.15s ease-out'

  // Add handle element to dialog.
  const handle = document.createElement('div')
  handle.innerHTML = `
    <div
      style="position: absolute; top: 4px; left: ${legacy ? '4px' : '0px'} with: 24px; height: 24px;"
      class="${EXTENSION_PREFIX}--draggable-handler"
    >
      <img src="${dragIndicatorSvg}" />
    </div>
  `
  dialogEl.append(handle)

  interact(dialogEl)
    .draggable({
      allowFrom: `.${EXTENSION_PREFIX}--draggable-handler`,
      inertia: true,
      modifiers: [
        interact.modifiers.restrictRect({
          restriction: 'body',
          endOnly: true
        })
      ],
      autoScroll: true,

      listeners: {
        move: dragMoveListener,
        end: dragEndListener
      }
    })
}

const removeDraggable = (dialogEl, legacy = false) => {
  dialogEl.attributes.draggable = false
  dialogEl.style.touchAction = 'auto'

  // Injected handle will be automatically removed along with the dialog element.
  const handle = dialogEl.querySelector(`${EXTENSION_PREFIX}--draggable-handler`)
  if (handle) {
    handle.remove()
  }

  interact(dialogEl).unset()
}

const dragMoveListener = (event) => {
  var target = event.target
  // keep the dragged position in the data-x/data-y attributes
  var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx
  var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy

  // translate the element
  target.style.webkitTransform =
    target.style.transform =
      'translate(' + x + 'px, ' + y + 'px)'

  // update the posiion attributes
  target.setAttribute('data-x', x)
  target.setAttribute('data-y', y)

  // Fade out dialog and scrim.
  const { scrim } = getScrim(target)
  target.style.opacity = 0.3
  if (scrim) {
    scrim.style.opacity = 0
  }
}

const dragEndListener = (event) => {
  var target = event.target

  // Resore dialog and scrim.
  const { scrim, legacy } = getScrim(target)
  target.style.opacity = 1
  if (scrim) {
    scrim.style.opacity = legacy ? 0.5 : 1
  }
}

const getScrim = (dialogEl) => {
  let result = { scrim: null, legacy: false }

  // New dialog + scrim used for "Issue Details" modal.
  const focusLock = dialogEl.closest('[data-focus-lock-disabled]')

  if (focusLock) {
    const scrim = focusLock && focusLock.children[0]

    if (focusLock) {
      result = { scrim, legacy: false }
    }
  } else {
    // Legacy dialog + scrim used by the "Create Issue" modal.
    const legacyScrim = document.querySelector('.aui-blanket')

    if (legacyScrim) {
      result = { scrim: legacyScrim, legacy: true }
    }
  }

  return result
}

const handleMutation = (mutationsList, observer) => {
  for (const mutation of mutationsList) {
    if (mutation.type === 'childList') {
      const { dialog: addedDialog, legacy: addedDialogLegacy } = getDialogFromNodeList(mutation.addedNodes)
      const { dialog: removedDialog, legacy: removedDialogLegacy } = getDialogFromNodeList(mutation.removedNodes)

      if (addedDialog && !addedDialog.attributes.draggable) {
        addDraggable(addedDialog, addedDialogLegacy)
      } else if (removedDialog && removedDialog.attributes.draggable) {
        removeDraggable(removedDialog, removedDialogLegacy)
      }
    }
  }
}

/* Unfortunately JIRA can inject the dialog in multiple places, including directly
under the body. This means we need to observe the entire body. */
const observerRoot = document.querySelector('body')
const observerConfig = { childList: true, subtree: true }
const observer = new MutationObserver(handleMutation)

observer.observe(observerRoot, observerConfig)

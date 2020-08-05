/**
 * 
 */

const EXTENSION_PREFIX = 'jmt'
const DRAGGABLE_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black" width="24px" height="24px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>'

const handleMutation = (mutationsList, observer) => {
  for (let mutation of mutationsList) {
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

const getDialogFromNodeList = (nodeList) => {
  let result = { dialog: null, legacy: false }

  if (!nodeList.length) {
    return result
  }

  for (let node of nodeList) {
    if (!node.tagName) {
      continue
    }

    const descendant = node.querySelector('[role="dialog"], .jira-dialog')
    const ascendant = node.closest('[role="dialog"], .jira-dialog')

    let dialogNode = null
    
    if (node.attributes.role === 'dialog' || node.classList.contains('jira-dialog')) {
      dialogNode = node
    } else if (descendant) {
      dialogNode = descendant
    } else if (ascendant) {
      dialogNode = ascendant
    }

    if (dialogNode) {
      const legacy = dialogNode.classList.contains('jira-dialog')
      result = { dialog: dialogNode, legacy }
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
  handle.classList.add(`${EXTENSION_PREFIX}--draggable-handler`)
  handle.style.position = 'absolute'
  handle.style.top = '4px'
  handle.style.left = legacy ? '4px' : '0px'
  handle.style.width = '24px'
  handle.style.height = '24px'
  handle.innerHTML = DRAGGABLE_ICON_SVG
  dialogEl.appendChild(handle)

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

const dragMoveListener = (event) =>{
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
    scrim.style.opacity = 0.1
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

/* Unfortunately JIRA can inject the dialog in multiple places, including directly 
under the body. This means we need to observe the entire body. */
const observerRoot = document.querySelector('body')
const observerConfig = { childList: true, subtree: true }
const observer = new MutationObserver(handleMutation)

observer.observe(observerRoot, observerConfig)
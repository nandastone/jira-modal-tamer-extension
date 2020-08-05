// @todo How to inject 3rd-party draggable code?

const EXTENSION_PREFIX = 'jmt'
const DRAGGABLE_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black" width="24px" height="24px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>'

const handleMutation = (mutationsList, observer) => {
  for (let mutation of mutationsList) {
    if (mutation.type === 'childList') {
      const addedDialog = getDialogFromNodeList(mutation.addedNodes)
      const removedDialog = getDialogFromNodeList(mutation.removedNodes)

      if (addedDialog && !addedDialog.attributes.draggable) {
        addDraggable(addedDialog)
      } else if (removedDialog && removedDialog.attributes.draggable) {
        removeDraggable(removedDialog)
      }
    }
  }
}

const getDialogFromNodeList = (nodeList) => {
  if (!nodeList.length) {
    return null
  }

  for (let node of nodeList) {
    const descendant = node.querySelector('[role="dialog"]')
    const ascendant = node.closest('[role="dialog"]')

    if (node.attributes.role === 'dialog') {
      return node
    } else if (descendant) {
      return descendant
    } else if (ascendant) {
      return ascendant
    }
  }

  return null
}

const addDraggable = (dialogNode) => {
  console.log('!!! A dialog was ADDED !!!', dialogNode)
  dialogNode.attributes.draggable = true
  dialogNode.style.touchAction = 'none'

  // Add handle element to dialog.
  const handle = document.createElement('div')
  handle.classList.add(`${EXTENSION_PREFIX}--draggable-handler`)
  handle.style.position = 'absolute'
  handle.style.top = '8px'
  handle.style.left = '8px'
  handle.style.width = '48px'
  handle.style.height = '48px'
  handle.innerHTML = DRAGGABLE_ICON_SVG
  dialogNode.appendChild(handle)

  // @todo make draggable

  interact(dialogNode)
    .draggable({
      allowFrom: `.${EXTENSION_PREFIX}--draggable-handler`,
      // enable inertial throwing
      inertia: true,
      // keep the element within the area of it's parent
      modifiers: [
        interact.modifiers.restrictRect({
          restriction: 'body',
          endOnly: true
        })
      ],
      // enable autoScroll
      autoScroll: true,

      listeners: {
        // call this function on every dragmove event
        move: dragMoveListener,
      }
    })
}

const removeDraggable = (dialogNode) => {
  console.log('!!! A dialog was REMOVED !!!', dialogNode)

  dialogNode.attributes.draggable = false
  dialogNode.style.touchAction = 'auto'

  // Remove handle element from dialog.
  const handle = dialogNode.querySelector(`${EXTENSION_PREFIX}--draggable-handler`)
  handle.remove()

  interact(dialogNode).unset()
}

function dragMoveListener (event) {
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
}


/**
 * Observe the dialog container for mutations, which will let us know when dialogs 
 * are opened and closed.
 */
const portalContainer = document.querySelector('.atlaskit-portal-container')
const mutationObserverConfig = { childList: true, subtree: true }
const observer = new MutationObserver(handleMutation)

observer.observe(portalContainer, mutationObserverConfig)
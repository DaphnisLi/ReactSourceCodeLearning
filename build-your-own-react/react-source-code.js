// 经过 createElement 转换后的数据
// {
//     "type": "div",
//     "props": {
//         "id": "foo",
//         "__source": {
//             "fileName": "/src/index.js",
//             "lineNumber": 271,
//             "columnNumber": 18
//         },
//         "children": [
//             {
//                 "type": "a",
//                 "props": {
//                     "__source": {
//                         "fileName": "/src/index.js",
//                         "lineNumber": 272,
//                         "columnNumber": 1
//                     },
//                     "children": [
//                         {
//                             "type": "TEXT_ELEMENT",
//                             "props": {
//                                 "nodeValue": "bar",
//                                 "children": []
//                             }
//                         }
//                     ]
//                 }
//             },
//             {
//                 "type": "b",
//                 "props": {
//                     "__source": {
//                         "fileName": "/src/index.js",
//                         "lineNumber": 273,
//                         "columnNumber": 1
//                     },
//                     "children": []
//                 }
//             }
//         ]
//     }
// }

{/* <div id="foo">
    <a>bar</a>
    <b />
</div> */}

// 下一个工作单位
let nextUnitOfWork = null
// 我们需要将在render函数上接收到的元素与我们提交给 DOM 的最后一个 Fiber 树进行比较。因此，我们需要在完成提交后保存“我们提交给 DOM 的最后一个光纤树”的引用。我们称之为currentRoot。
// 提交给 DOM 的最后一个光纤树
let currentRoot = null
// 正在进行的工作
let wipRoot = null
// 想要删除的节点
let deletions = null


// 我们需要更新的一种特殊道具是事件监听器，因此如果道具名称以“on”前缀开头，我们将以不同的方式处理它们。
const isEvent = key => key.startsWith("on")
const isProperty = key => key !== "children" && !isEvent(key)
const isNew = (prev, next) => key =>
    prev[key] !== next[key]
const isGone = (prev, next) => key => !(key in next)

// 正在工作的 fiber
let wipFiber = null
// 当前 hook 的索引
let hookIndex = null

// 创建文本模版
function createTextElement(text) {
    return {
        type: "TEXT_ELEMENT",
        props: {
            nodeValue: text,
            children: [],
        },
    }
}

// 创建模版
function createElement(type, props, ...children) {
    return {
        type,
        props: {
            ...props,
            children: children.map(child =>
                typeof child === "object" ? child : createTextElement(child)
            ),
        },
    }
}

// 渲染函数
// render 函数会先遍历父节点，然后会遍历子节点，如果子节点没有子节点了，就会遍历子节点的兄弟节点，如果兄弟节点没有子节点了，就会遍历父节点，依次往上
function render(element, container) {
    // element = div, container = root
    wipRoot = {
        dom: container,
        props: {
            children: [element],
        },
        // 我们还将该alternate属性添加到每个纤维中。该属性是旧纤程的链接，即我们在前一个提交阶段提交给 DOM 的fiber
        alternate: currentRoot, // 最后一次提交的 fiber
    }
    deletions = []
    nextUnitOfWork = wipRoot
}

function createDom(fiber) {
    const dom =
        fiber.type == "TEXT_ELEMENT"
            ? document.createTextNode("")
            : document.createElement(fiber.type)

    const isProperty = key => key !== "children"
    Object.keys(fiber.props)
        .filter(isProperty)
        .forEach(name => {
            dom[name] = fiber.props[name]
        })

    return dom
}

function updateDom(dom, prevProps, nextProps) {
    // 如果事件处理程序发生变化，我们将其从节点中删除。
    Object.keys(prevProps)
        .filter(isEvent)
        .filter(
            key =>
                !(key in nextProps) ||
                isNew(prevProps, nextProps)(key)
        )
        .forEach(name => {
            const eventType = name
                .toLowerCase()
                .substring(2)
            dom.removeEventListener(
                eventType,
                prevProps[name]
            )
        })
    Object.keys(prevProps)
        .filter(isProperty)
        .filter(isGone(prevProps, nextProps))
        .forEach(name => {
            dom[name] = ""
        })

    // Set new or changed properties
    Object.keys(nextProps)
        .filter(isProperty)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            dom[name] = nextProps[name]
        })

    // 然后我们添加新的处理程序
    Object.keys(nextProps)
        .filter(isEvent)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            const eventType = name
                .toLowerCase()
                .substring(2)
            dom.addEventListener(
                eventType,
                nextProps[name]
            )
        })
}

function commitRoot() {
    deletions.forEach(commitWork)
    commitWork(wipRoot.child)
    currentRoot = wipRoot
    wipRoot = null
}

// 一旦我们完成了所有的工作（我们知道这是因为没有下一个工作单元）我们将整个光纤树提交给 DOM。我们在commitRoot函数中进行。在这里，我们递归地将所有节点附加到 dom。
function commitWork(fiber) {
    if (!fiber) {
        return
    }
    let domParentFiber = fiber.parent
    while (!domParentFiber.dom) {
        domParentFiber = domParentFiber.parent
    }
    const domParent = domParentFiber.dom
    if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
        domParent.appendChild(fiber.dom)
    } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
        updateDom(fiber.dom, fiber.alternate.props, fiber.props)
    }
    else if (fiber.effectTag === "DELETION") {
        commitDeletion(fiber, domParent)
    }
    commitWork(fiber.child)
    commitWork(fiber.sibling)
}

function commitDeletion(fiber, domParent) {
    if (fiber.dom) {
        domParent.removeChild(fiber.dom)
    } else {
        commitDeletion(fiber.child, domParent)
    }
}



function workLoop(deadline) {
    let shouldYield = false
    while (nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
        shouldYield = deadline.timeRemaining() < 1
        // 如果回调完成了一个任务并且有另一个任务要开始，它可以调用timeRemaining()以查看是否有足够的时间来完成下一个任务。如果没有，回调可以立即返回，或者寻找其他工作来处理剩余时间。
    }
    if (!nextUnitOfWork && wipRoot) {
        commitRoot()
    }
    requestIdleCallback(workLoop)
    // window.requestIdleCallback()方法插入一个函数，这个函数将在浏览器空闲时期被调用。
    // 这使开发者能够在主事件循环上执行后台和低优先级工作，而不会影响延迟关键事件，如动画和输入响应。函数一般会按先进先调用的顺序执行
    // 然而，如果回调函数指定了执行超时时间timeout，则有可能为了在超时前执行函数而打乱执行顺序。
}

requestIdleCallback(workLoop)

// 该函数不仅执行工作而且返回下一个工作单元。
function performUnitOfWork(fiber) {
    // 函数组件在两个方面有所不同
    // 1.来自函数组件的 fiber 没有 DOM 节点
    // 2.并且 children 来自 return 而不是 props
    const isFunctionComponent = fiber.type instanceof Function
    if (isFunctionComponent) {
        updateFunctionComponent(fiber)
    } else {
        updateHostComponent(fiber)
    }

    if (fiber.child) {
        return fiber.child
    }
    let nextFiber = fiber
    while (nextFiber) {
        if (nextFiber.sibling) {
            return nextFiber.sibling
        }
        nextFiber = nextFiber.parent
    }
}

// 更新函数组件
function updateFunctionComponent(fiber) {
    wipFiber = fiber
    hookIndex = 0
    // 用来支持 hook 在同一组件多次调用
    wipFiber.hooks = []
    const children = [fiber.type(fiber.props)]
    reconcileChildren(fiber, children)
}

function updateHostComponent(fiber) {
    if (!fiber.dom) {
        fiber.dom = createDom(fiber)
    }
    reconcileChildren(fiber, fiber.props.children)
}

// 创建新 fiber、对比旧 fiber 和新 fiber
function reconcileChildren(wipFiber, elements) {
    // wipRoot = {
    //     dom: container,
    //     props: {
    //         children: [element],
    //     },
    //     // 我们还将该alternate属性添加到每个纤维中。该属性是旧纤程的链接，即我们在前一个提交阶段提交给 DOM 的fiber
    //     alternate: currentRoot, // 最后一次提交的 fiber
    // }
    // elements: div
    let index = 0
    // 旧的 fiber
    let oldFiber = wipFiber?.alternate?.child // null
    // 上一个兄弟节点
    let prevSibling = null 

    while (index < elements.length || oldFiber != null) {
        const element = elements[index]

        let newFiber = null

        // 为了比较它们，我们使用以下类型：
        // 如果旧的 Fiber 和新的元素具有相同的类型，我们可以保留 DOM 节点并使用新的 props 更新它
        // 如果类型不同并且有一个新元素，则意味着我们需要创建一个新的DOM节点
        // 如果类型不同并且有旧光纤，我们需要删除旧节点
        // 这里 React 也使用了键，这可以更好地协调。例如，它检测子元素何时更改元素数组中的位置。

        const sameType = element?.type == oldFiber?.type

        //当旧的 Fiber 和元素具有相同的类型时，我们创建一个新的 Fiber，保留来自旧 Fiber 的 DOM 节点和来自元素的 props。
        // 我们还为纤程添加了一个新属性：effectTag. 我们稍后会在提交阶段使用这个属性。
        if (sameType) {
            newFiber = {
                type: oldFiber.type,
                props: element.props,
                dom: oldFiber.dom,
                parent: wipFiber,
                alternate: oldFiber,
                effectTag: "UPDATE",
            }
        }
        // 对于元素需要一个新的 DOM 节点的情况，我们用PLACEMENTeffect 标签来标记新的 Fiber 。
        if (element && !sameType) {
            newFiber = {
                type: element.type,
                props: element.props,
                dom: null,
                parent: wipFiber,
                alternate: null,
                effectTag: "PLACEMENT",
            }
        }
        // 对于我们需要删除节点的情况，我们没有新的光纤，所以我们将效果标签添加到旧光纤。但是当我们将纤程树提交到 DOM 时，我们会从没有旧纤程的正在进行的工作根中进行。
        if (oldFiber && !sameType) {
            oldFiber.effectTag = "DELETION"
            deletions.push(oldFiber)
        }

        if (oldFiber) {
            oldFiber = oldFiber.sibling
        }

        if (index === 0) {
            wipFiber.child = newFiber
        } else {
            prevSibling.sibling = newFiber // 这行代码似乎没用
        }

        prevSibling = newFiber
        index++
    }
}

function useState(initial) {
    const oldHook =
        wipFiber.alternate &&
        wipFiber.alternate.hooks &&
        wipFiber.alternate.hooks[hookIndex]
    const hook = {
        state: oldHook ? oldHook.state : initial,
        queue: [],
    }
    const actions = oldHook ? oldHook.queue : []
    actions.forEach(action => {
        hook.state = action(hook.state)
    })
    const setState = action => {
        hook.queue.push(action)
        wipRoot = {
            dom: currentRoot.dom,
            props: currentRoot.props,
            alternate: currentRoot,
        }
        nextUnitOfWork = wipRoot
        deletions = []
    }

    wipFiber.hooks.push(hook)
    hookIndex++
    return [hook.state, setState]
}

const Didact = {
    createElement,
    render,
    useState,
}

/** @jsx Didact.createElement */
function Counter() {
    const [state, setState] = Didact.useState(1)
    return (
        <h1 onClick={() => setState(c => c + 1)}>
            Count: {state}
        </h1>
    )
}
const element = <Counter />
const container = document.getElementById("root")
Didact.render(element, container)

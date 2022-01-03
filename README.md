1.用 JSX 定义的元素，不是有效的 JavaScript，所以为了用 vanilla.js 替换它，首先我们需要用有效的 JS 替换它。JSX 通过 Babel 等构建工具转换为 JS。转换很简单：用html标签调用createElement，传递标签名称、属性和子项作为参数。

2./** @jsx Didact.createElement */ 可以使jsx自动执行 Didact.createElement

3.window.requestIdleCallback()方法插入一个函数，这个函数将在浏览器空闲时期被调用。这使开发者能够在主事件循环上执行后台和低优先级工作，而不会影响延迟关键事件，如动画和输入响应。函数一般会按先进先调用的顺序执行，然而，如果回调函数指定了执行超时时间timeout，则有可能为了在超时前执行函数而打乱执行顺序。

4。timeRemaining 如果回调完成了一个任务并且有另一个任务要开始，它可以调用timeRemaining()以查看是否有足够的时间来完成下一个任务。如果没有，回调可以立即返回，或者寻找其他工作来处理剩余时间。


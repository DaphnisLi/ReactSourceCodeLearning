
const element = <h1 title="foo">Hello</h1>
const container = document.getElementById("root")
ReactDOM.render(element, container)

// ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
// 通过 Babel 将jsx转换成js, 并渲染dom
const element = {
    type: 'h1',
    props: {
        title: 'foo',
        children: 'Hello',
    },
}
const container = document.getElementById("root")

const node = document.createElement(element.type)
node["title"] = element.props.title
const text = document.createTextNode("")
text["nodeValue"] = element.props.children // nodeValue 和 data 都可以表示 createTextNode 的值
node.appendChild(text)
container.appendChild(node)

// ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————


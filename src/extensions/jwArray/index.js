const BlockType = require('../../extension-support/block-type')
const BlockShape = require('../../extension-support/block-shape')
const ArgumentType = require('../../extension-support/argument-type')
const Cast = require('../../util/cast')

/**
* @param {number} x
* @returns {string}
*/
function formatNumber(x) {
   if (x >= 1e6) {
       return x.toExponential(4)
   } else {
       x = Math.floor(x * 1000) / 1000
       return x.toFixed(Math.min(3, (String(x).split('.')[1] || '').length))
   }
}

function span(text) {
    let el = document.createElement('span')
    el.innerHTML = text
    el.style.display = 'hidden'
    el.style.whiteSpace = 'nowrap'
    el.style.width = '100%'
    el.style.textAlign = 'center'
    return el
}

class ArrayType {
    customId = "jwArray"

    array = []

    constructor(array = []) {
        this.array = array
    }

    static display(x) {
        try {
            switch (typeof x) {
                case "object":
                    if (typeof x.jwArrayHandler == "function") {
                        return x.jwArrayHandler()
                    }
                    return "Object"
                case "number":
                    return formatNumber(x)
                case "string":
                case "boolean":
                    return Cast.toString(x)
            }
        } catch {}
        return "Unknown"
    }

    jwArrayHandler() {
        return `Array[${this.array.length}]`
    }

    toString() {
        return JSON.stringify(this.array)
    }
    toMonitorContent = () => span(this.toString())

    toReporterContent() {
        let root = document.createElement('div')
        root.style.display = 'flex'
        root.style.flexDirection = 'column'
        root.style.justifyContent = 'center'

        let arrayDisplay = span(`[${this.array.slice(0, 50).map(v => ArrayType.display(v)).join(', ')}]`)
        arrayDisplay.style.overflow = "hidden"
        arrayDisplay.style.whiteSpace = "nowrap"
        arrayDisplay.style.textOverflow = "ellipsis"
        arrayDisplay.style.maxWidth = "256px"
        root.appendChild(arrayDisplay)

        root.appendChild(span(`Length: ${this.array.length}`))

        return root
    }
}

const Array = {
    Type: ArrayType,
    Block: {
        blockType: BlockType.REPORTER,
        blockShape: BlockShape.SQUARE,
        forceOutputType: "Array",
        disableMonitor: true
    },
    Argument: {
        shape: BlockShape.SQUARE,
        check: ["Array"]
    }
}

class Extension {
    constructor() {
        vm.jwArray = Array
    }

    getInfo() {
        return {
            id: "jwArray",
            name: "Arrays",
            color1: "#ff513d",
            blocks: [
                {
                    opcode: 'blank',
                    text: 'blank array',
                    ...Array.Block
                }, {
                    opcode: 'test',
                    text: 'poopie test',
                    ...Array.Block
                }
            ]
        };
    }

    blank() {
        return new Array.Type()
    }

    test() {
        return new Array.Type([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
    }
}

module.exports = Extension
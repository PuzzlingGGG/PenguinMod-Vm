const BlockType = require('../../extension-support/block-type')
const BlockShape = require('../../extension-support/block-shape')
const ArgumentType = require('../../extension-support/argument-type')
const TargetType = require('../../extension-support/target-type')
const Cast = require('../../util/cast')

const Matter = require('matter-js')

let Vector = {
    Type: class {},
    Block: {},
    Argument: {}
}

class Extension {
    constructor() {
        if (!vm.jwVector) vm.extensionManager.loadExtensionIdSync('jwVector')
        Vector = vm.jwVector

        this.engine = Matter.Engine.create()
        /** @type {Array.<Matter.Body>} */
        this.bodies = {}
        /** @type {Matter.Composite?} */
        this.bounds = null
        
        vm.runtime.on("PROJECT_START", this.reset.bind(this));

        vm.PsychicDebug = this;
    }

    getInfo() {
        return {
            id: "jwPsychic",
            name: "Psychic",
            blocks: [
                {
                    opcode: 'tick',
                    text: 'tick',
                    blockType: BlockType.COMMAND
                },
                "---",
                {
                    opcode: 'boundaries',
                    text: 'set boundaries [OPTION]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        OPTION: {
                            type: ArgumentType.STRING,
                            menu: 'boundariesOption'
                        }
                    }
                },
                {
                    opcode: 'setGravity',
                    text: 'set gravity to [VECTOR]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        VECTOR: Vector.Argument
                    }
                },
                {
                    opcode: 'getGravity',
                    text: 'gravity',
                    ...Vector.Block
                },
                "---",
                {
                    opcode: 'enablePhysics',
                    text: 'enable physics as [OPTION]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        OPTION: {
                            type: ArgumentType.STRING,
                            menu: 'enablePhysicsOption'
                        }
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'disablePhysics',
                    text: 'disable physics',
                    blockType: BlockType.COMMAND,
                    filter: [TargetType.SPRITE]
                },
                "---",
                {
                    opcode: 'setPos',
                    text: 'set position to [VECTOR]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        VECTOR: Vector.Argument
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'getPos',
                    text: 'position',
                    filter: [TargetType.SPRITE],
                    ...Vector.Block
                },
                {
                    opcode: 'setVel',
                    text: 'set velocity to [VECTOR]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        VECTOR: Vector.Argument
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'getVel',
                    text: 'velocity',
                    filter: [TargetType.SPRITE],
                    ...Vector.Block
                },
                {
                    opcode: 'setRot',
                    text: 'set rotation to [ANGLE]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        ANGLE: {
                            type: ArgumentType.ANGLE,
                            defaultValue: 90
                        }
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'getRot',
                    text: 'rotation',
                    blockType: BlockType.REPORTER,
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'setAngVel',
                    text: 'set angular velocity to [ANGLE]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        ANGLE: {
                            type: ArgumentType.ANGLE,
                            defaultValue: 0
                        }
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'getAngVel',
                    text: 'angular velocity',
                    blockType: BlockType.REPORTER,
                    filter: [TargetType.SPRITE]
                }
            ],
            menus: {
                enablePhysicsOption: [
                    'precise',
                    'box',
                    'circle'
                ],
                boundariesOption: [
                    'all',
                    'floor',
                    'none'
                ]
            }
        };
    }

    vectorToMatter(vector) {
        return Matter.Vector.create(vector.x, -vector.y)
    }

    matterToVector(matter) {
        return new Vector.Type(matter.x, -matter.y)
    }

    angleToMatter(angle) {
        return (angle - 90) * Math.PI / 180
    }

    matterToAngle(matter) {
        return (matter * 180 / Math.PI) + 90
    }

    reset() {
        this.engine = Matter.Engine.create()
        this.bodies = {}
        this.bounds = null
    }

    correctBody(id) {
        /** @type {Matter.Body} */
        let body = this.bodies[id]
        let target = vm.runtime.getTargetById(id)

        if (target == undefined) {
            Matter.Composite.remove(this.engine.world, body)
            delete this.bodies[id]
            return
        }

        Matter.Body.setPosition(body, Matter.Vector.create(target.x, -target.y))
        Matter.Body.setAngle(body, this.angleToMatter(target.direction))
    }

    correctTarget(id) {
        /** @type {Matter.Body} */
        let body = this.bodies[id]
        let target = vm.runtime.getTargetById(id)

        target.setXY(body.position.x, -body.position.y, false, true)
        target.setDirection(this.matterToAngle(body.angle))
    }

    tick() {
        let fps = vm.runtime.frameLoop.framerate
        if (fps == 0) fps = 60

        for (let id of Object.keys(this.bodies)) {
            this.correctBody(id)
        }

        Matter.Engine.update(this.engine, 1000 / fps)

        for (let id of Object.keys(this.bodies)) {
            this.correctTarget(id)
        }
    }

    boundaries({OPTION}) {
        if (this.bounds) {
            Matter.Composite.remove(this.engine.world, this.bounds)
            this.bounds = null
        }

        let stageWidth = vm.runtime.stageWidth
        let stageHeight = vm.runtime.stageHeight

        this.bounds = Matter.Composite.create()

        switch (OPTION) {
            case 'all':
                Matter.Composite.add(this.bounds, [
                    Matter.Bodies.rectangle(-stageWidth, 0, stageWidth, Number.MAX_SAFE_INTEGER / 2, { isStatic: true }),
                    Matter.Bodies.rectangle(stageWidth, 0, stageWidth, Number.MAX_SAFE_INTEGER / 2, { isStatic: true }),
                    Matter.Bodies.rectangle(0, -stageHeight, Number.MAX_SAFE_INTEGER / 2, stageHeight, { isStatic: true }),
                ])
            case 'floor':
                Matter.Composite.add(this.bounds, Matter.Bodies.rectangle(0, stageHeight, Number.MAX_SAFE_INTEGER / 2, stageHeight, { isStatic: true }))
                break
        }

        Matter.Composite.add(this.engine.world, this.bounds)
    }

    setGravity({VECTOR}) {
        let v = Vector.Type.toVector(VECTOR)
        this.engine.gravity.x = v.x
        this.engine.gravity.y = -v.y
    }

    getGravity() {
        return this.matterToVector(this.engine.gravity)
    }

    enablePhysics({OPTION}, util) {
        let target = util.target
        let size = {
            x: target.getCostumes()[target.currentCostume].size[0] * (target.size / 100) * (target.stretch[0] / 100),
            y: target.getCostumes()[target.currentCostume].size[1] * (target.size / 100) * (target.stretch[1] / 100)
        }

        console.debug(size)

        let body = null
        switch (OPTION) {
            case 'precise':
                throw "i need to finish precise mb"
                break
            case 'box':
                body = Matter.Bodies.rectangle(target.x, -target.y, size.x, size.y)
                break
            case 'circle':
                body = Matter.Bodies.circle(target.x, -target.y, Math.max(size.x, size.y) / 2)
                break
            default:
                throw "Invalid physics option"
        }

        console.debug(body.bounds)

        this.bodies[target.id] = body
        Matter.Composite.add(this.engine.world, body)

        this.correctBody(target.id)
    }

    disablePhysics({}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return
        Matter.Composite.remove(this.engine.world, body)
        delete this.bodies[id]
        return
    }

    setPos({VECTOR}, util) {
        let v = Vector.Type.toVector(VECTOR)
        util.target.setXY(v.x, v.y)
    }

    getPos({}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return new Vector.Type(util.target.x, util.target.y)
        return this.matterToVector(body.position)
    }

    setRot({ANGLE}, util) {
        let a = Cast.toNumber(ANGLE)
        util.target.setDirection(a)
    }

    getRot({}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return util.target.direction
        return this.matterToAngle(body.angle)
    }

    setVel({VECTOR}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return
        let v = Vector.Type.toVector(VECTOR)
        Matter.Body.setVelocity(body, this.vectorToMatter(v))
    }

    getVel({}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return new Vector.Type(0, 0)
        return this.matterToVector(body.velocity)
    }

    setAngVel({ANGLE}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return
        Matter.Body.setAngularVelocity(body, Cast.toNumber(ANGLE))
    }

    getAngVel({}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return 0
        return body.angularVelocity
    }
}

module.exports = Extension
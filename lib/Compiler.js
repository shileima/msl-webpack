let fs = require('fs');
let path = require('path');
let babylon = require('babylon'); // 把babel转成ast
let traverse = require('@babel/traverse').default;
let t = require('@babel/types');
let generator = require('@babel/generator').default;
let ejs = require('ejs');

class Compiler {
    constructor(config) {
        this.config = config
        // 保存入口文件的路径
        this.entryId;
        // 保存所有的模块依赖
        this.modules = {}
        this.entry = config.entry;
        this.root = process.cwd();

    }
    getSource(modulePath) {
        let rules = this.config.module.rules;
        let content = fs.readFileSync(modulePath, 'utf8')
        for (let i = 0; i < rules.length; i++) {
            let rule = rules[i]
            let { test, use } = rule
            let len = use.length - 1
            if (test.test(modulePath)) {
                function normalLoader() {
                    let loader = require(use[len--]) // 获取对应loader函数
                    content = loader(content)
                    if (len >= 0) {
                        normalLoader()
                    }
                }
                normalLoader()
            }
        }

        return content;
    }
    parse(source, parentPath) {
        // console.log(source,parentPath)
        // console.log(source)
        let ast = babylon.parse(source)
        // console.log(ast)
        let dependencies = [] // 依赖数组
        traverse(ast, {
            CallExpression(p) {
                let node = p.node;
                if (node.callee.name) {
                    node.callee.name = '__webpack_require__';
                    let moduleName = node.arguments[0].value;
                    moduleName = moduleName + (path.extname(moduleName) ? '' : '.js');
                    moduleName = './' + path.join(parentPath, moduleName)
                    dependencies.push(moduleName)
                    node.arguments = [t.stringLiteral(moduleName)];
                    // console.log(node)
                }
            }
        });
        let sourceCode = generator(ast).code;
        //console.log(sourceCode)
        //console.log(dependencies)
        //console.log('-----------------')
        return { sourceCode, dependencies }
    }
    // 构建模块
    buildModule(modulePath, isEntry) {
        let source = this.getSource(modulePath);
        // 与 path.resolve 相反
        let moduleName = './' + path.relative(this.root, modulePath);
        if (isEntry) {
            this.entryId = moduleName
        }
        // console.log(source,moduleName)
        let { sourceCode, dependencies } = this.parse(source, path.dirname(moduleName));
        console.log(sourceCode,dependencies)
        this.modules[moduleName] = sourceCode;
        dependencies.forEach(dep => {
            this.buildModule(path.join(this.root, dep), false);
        })

    }
    emitFile() {
        let main = path.join(this.config.output.path, this.config.output.filename)
        let templateString = this.getSource(path.join(__dirname, 'main.ejs'))
        let code = ejs.render(templateString, { entryId: this.entryId, modules: this.modules })
        this.assets = {}
        this.assets[main] = code
        console.log(main);

        fs.writeFileSync(main, this.assets[main])
    }
    run() {
        // 执行并创建模块依赖关系
        this.buildModule(path.resolve(this.root, this.entry), true);

        // 发射打包后的文件
        this.emitFile()

    }
}

module.exports = Compiler
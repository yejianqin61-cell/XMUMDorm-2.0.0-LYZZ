require('dotenv').config();
// a) `require()`
// 类型：Node.js全局函数
// 作用：导入模块（CommonJS模块系统）
// 参数：模块名称或文件路径
// 返回值：模块导出的对象

// 工作流程：
// 1. 查找模块：node_modules/dotenv → package.json → main字段指定的文件
// 2. 加载模块：执行模块代码
// 3. 缓存模块：下次require直接返回缓存
// 4. 返回exports对象

// b) `'dotenv'`
// 类型：字符串字面量，模块标识符
// 作用：指定要加载的模块名称
// 位置：会在node_modules文件夹中查找
// 对应的包：dotenv npm包

// 实际执行过程：   
const dotenvModule = require('dotenv');
// dotenvModule现在包含了dotenv包导出的所有内容

// b) `config`
// 类型：函数（方法）
// 作用：dotenv模块的核心功能
// 效果：读取.env文件并设置环境变量

// config()函数的工作：
// 1. 查找项目根目录下的.env文件
// 2. 解析文件内容（每行KEY=VALUE格式）
// 3. 将键值对设置到process.env
// 4. 返回解析结果对象（包含parsed、error等）
// 中文直译：
"加载dotenv模块，并立即调用它的config方法"

// 分步执行：
// 步骤1：require('dotenv')
//   → 从node_modules加载dotenv包
//   → 返回一个包含config方法的对象

// 步骤2：.config()
//   → 调用config方法
//   → 读取.env文件
//   → 将变量注入process.env

// 步骤3：整体效果
//   → 环境变量从.env文件加载
//   → 后续代码可以通过process.env访问













const PORT = process.env.PORT || 4040;  
这句话port
// 类型：标识符（变量名）
// 作用：存储端口号的值
// 命名约定：全大写表示常量（约定，非强制）
// 效果：后续代码可以用`PORT`引用这个值


// a) `process`
// 类型：Node.js全局对象
// 作用：提供当前Node.js进程的信息和控制
// 内容：包含env、argv、cwd()、exit()等方法
// 示例：
console.log(process.pid);    // 进程ID
console.log(process.argv);   // 命令行参数


// b) `.env`
// 类型：process对象的属性
// 作用：存储环境变量的对象
// 来源：
//   1. 系统环境变量
//   2. .env文件（使用dotenv包）
//   3. 启动时设置：PORT=3000 node server.js
// 示例：
// 终端输入：export PORT=5000
// 然后：console.log(process.env.PORT); // 输出: 5000

// c) `.PORT`
// 类型：env对象的属性
// 作用：获取名为"PORT"的环境变量值
// 命名约定：通常大写，但可以任意
// 环境变量设置方式：
//   Linux/Mac: export PORT=3000
//   Windows: set PORT=3000 或 $env:PORT=3000
//   在代码中：process.env.PORT = 3000
//   .env文件：PORT=3000



// ============================================
// 中间件配置（Middleware）
// ============================================
// 中间件是在请求和响应之间执行的函数，可以处理请求、修改响应等

// 7. 使用 CORS 中间件
// cors() 允许所有源（前端地址）访问我们的 API
// 在实际生产环境中，应该配置允许的具体域名
app.use(cors());


// 8. 使用 JSON 解析中间件
// 当前端发送 POST 请求时，数据通常是 JSON 格式的
// 这个中间件会自动解析请求体中的 JSON 数据，转换成 JavaScript 对象
// 解析后的数据可以通过 req.body 访问
app.use(express.json());



app.use() 是 Express 应用对象的一个方法，它用来向应用程序添加中间件（middleware）。
5. 为什么顺序很重要？
Express 按中间件添加的顺序执行它们：


app.use(cors());           // 1. 先处理 CORS
app.use(express.json());   // 2. 再解析 JSON 数据
app.use(express.urlencoded(...)); // 3. 最后解析表单数据
// 这样设计是因为解析数据需要在 CORS 之后进行

==================================================================
app.use((err, req, res, next) => {
  // 输出错误信息到控制台，方便调试
  console.error('服务器错误:', err);
  
  // 向客户端返回错误信息
  res.status(err.status || 500).json({
    status: -1, // 错误状态码
    message: err.message || '服务器内部错误',
    // 在开发环境中，返回详细的错误堆栈信息
    // 在生产环境中，不应该返回堆栈信息，因为可能包含敏感信息
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});
协同关系：

这是一个错误处理中间件（有4个参数，区别于普通中间件的3个参数）

Express 会自动识别 (err, req, res, next) 这种签名作为错误处理器

当路由或其他中间件调用 next(error) 时，Express 会跳过所有普通中间件，直接找到这个错误处理中间件

第11行：...(process.env.NODE_ENV === 'development' && { stack: err.stack })
javascript
...                    // 展开运算符：将对象展开并合并到当前对象
(                      // 括号：定义表达式
process.env.NODE_ENV   // 访问：Node.js 环境变量 NODE_ENV
===                    // 严格相等运算符：比较值是否相等
'development'          // 字符串：表示开发环境
&&                     // 逻辑与运算符：如果左边为真，则返回右边
{ stack: err.stack }   // 对象：包含 stack 属性的对象
)                      // 结束表达式
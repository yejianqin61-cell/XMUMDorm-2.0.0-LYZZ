获取DOM元素,->
封装显示消息函数->
角色切换处理,若是学生,隐藏商家字段,清除商家字段的必填验证,反之亦然->
邮箱填写的邮箱验证->
向后端发送邮箱字段,data接受返回体->
处理注册表单提交,获取表单数据,,身份,验证密码长度,一致性,->
接受私有字段,学生的邮箱,昵称,邮箱验证码;商家的昵称,邀请码->
发送注册请求,data接受返回体->
本地保存用户信息和token->
跳转到登陆页面->
错误处理

页面加载完成
→ 获取 DOM 元素
→ 初始化 UI 提示函数
→ 监听角色切换，动态调整表单显示与校验规则
→ 邮箱验证码请求前校验（格式 / 域名）
→ 发送验证码请求，处理后端响应
→ 监听注册表单提交
→ 获取角色与基础字段（role / password）
→ 校验密码规则
→ 根据角色补充专属字段（学生 / 商家）
→ 组装请求数据
→ 发送注册请求
→ 处理后端响应
  → 成功：保存 token 与用户信息，跳转登录页
  → 失败：显示错误信息















Q1：studentFields / merchantFields 是不是“学生/商家的注册信息统称”？

是的，而且你这个理解是 80% 正确的。

更准确一点说：

studentFields
👉 页面上一整块 DOM 容器
👉 里面放的是：email / emailCode / username 这些“学生注册才需要的输入框”

merchantFields
👉 也是一整块 DOM 容器
👉 里面放的是：merchantUsername / inviteCode

⚠️ 注意一个关键点（工程意识）：

它们不是“数据”，而是“界面区域”

真正的数据：

来自 input.value

被组装进 requestData

最终发给后端

Q2：roleInputs、this.value、this 到底是谁？
① roleInputs 是什么？
const roleInputs = document.querySelectorAll('input[name="role"]');


意思是：

找到 所有 name="role" 的 input

通常是这种 HTML：

<input type="radio" name="role" value="student">
<input type="radio" name="role" value="merchant">


所以：

roleInputs 是一个 NodeList

里面是 两个 radio 按钮

一个 student，一个 merchant

② roleInputs.forEach(input => { ... }) 是干嘛的？

意思是：

给每一个角色选项都绑定“切换监听”

你点学生 / 商家时：

就会触发下面这个 change 事件

③ this.value 中的 this 是谁？

这是一个非常重要的 JS 基础点，你现在该补上了。

在这里：

input.addEventListener('change', function () {
  console.log(this);
});


👉 this 指的是：
“当前触发事件的那个 input 元素本身”

也就是说：

你点了 student
→ this.value === 'student'

你点了 merchant
→ this.value === 'merchant'

所以这段逻辑本质是：

如果用户选的是学生
 → 显示学生区
 → 隐藏商家区
 → 改 required 校验规则
否则
 → 反过来


这就是典型的“前端状态切换逻辑”。

Q3：await + fetch 你理解对了吗？

你这句理解 基本完全正确 👏

response 要等到访问完这个 url，得到返回体再赋值？

✔️ 是的，而且我给你一个精确版本：

const response = await fetch(...)


意思是：

暂停当前函数
👉 等 HTTP 请求完成
👉 拿到服务器返回的 Response 对象
👉 再继续往下执行

然后：

const data = await response.json();


意思是：

再等一小会儿
👉 把响应体里的 JSON 解析成 JS 对象

你那段“是不是前端在打包”的理解，怎么修正？

你说的是：

前端正在打包，然后 try 是前端在发送信息

更准确的说法是：

if (...) return
👉 前端在做“本地校验”

try { fetch(...) }
👉 前端把数据“正式交给后端”

工程上叫：

前端兜底校验 + 后端最终校验

Q4：为什么 URL 里有 /api/auth，但 auth.js 里只有 /send-verification-code？

你这个问题 非常到位，已经在问“路由挂载机制”了。

答案：你猜得完全正确

是因为 在 server.js 里有挂载，类似这样：

app.use('/api/auth', authRoutes);


而在 auth.js 里：

router.post('/send-verification-code', ...)


所以最终路径 =

/api/auth + /send-verification-code


👉 前端必须写 完整路径
👉 后端在 router 里只写 相对路径

这是 Express 的核心设计

Q5：const data = await response.json(); 是不是接收成功与否信息？

✔️ 是的，但我们说得工程一点：

data 一般长这样：

{
  "status": 0,
  "message": "OK",
  "data": {...},
  "token": "xxx"
}


前端关心的通常是：

status：成功 / 失败

message：提示

data：用户信息

token：登录态

所以你后面看到的：

if (data.status === 0) { ... }


👉 就是统一响应结构的消费端

Q6：requestData 先定义一部分，后面再补字段，是什么意思？

你这个问题非常关键，因为这是**“数据组装思维”**。

先看这段：
let requestData = {
  role: selectedRole,
  password: password
};


含义是：

不管学生还是商家
👉 都必须有 role
👉 都必须有 password

这是**“公共字段”**

后面为什么再加？
requestData.email = email;
requestData.username = username;


因为：

学生有：email / verification_code

商家有：invite_code

不是所有角色都有

所以工程上正确做法是：

先放公共字段
再根据 role 条件性补充

这是非常标准、非常成熟的写法 👍# register.js 逐行代码解析

## 文件概述
这是一个注册页面的 JavaScript 文件，支持学生和商家两种角色的注册功能。

---

## 逐行解析

### 第 1-3 行：文件注释
```javascript
// 注册页面 JavaScript
// 创建时间: 2025-01-26
// 最新修改: 2025-01-26 - 支持商家/非商家注册
```
**类型**：注释（单行注释）
**作用**：说明文件用途、创建时间和最新修改信息
**联动关系**：无，仅用于代码文档说明

---

### 第 5 行：DOM 加载事件监听
```javascript
document.addEventListener('DOMContentLoaded', function() {
```
**类型**：事件监听器（Event Listener）
**作用**：等待 HTML DOM 完全加载后再执行内部代码，确保所有 DOM 元素都已存在
**联动关系**：
- 监听 `document` 对象的 `DOMContentLoaded` 事件
- 回调函数包含所有后续代码（第 6-209 行）
- 这是整个脚本的入口点

---

### 第 6 行：获取注册表单元素
```javascript
  const registerForm = document.getElementById('registerForm');
```
**类型**：DOM 查询 + 常量声明
**作用**：通过 ID 获取注册表单元素，用于后续绑定提交事件
**联动关系**：
- 依赖 HTML 中 ID 为 `registerForm` 的表单元素
- 在第 100 行用于绑定 `submit` 事件监听器

---

### 第 7 行：获取消息显示区域
```javascript
  const messageDiv = document.getElementById('message');
```
**类型**：DOM 查询 + 常量声明
**作用**：获取用于显示提示消息的 DOM 元素
**联动关系**：
- 依赖 HTML 中 ID 为 `message` 的元素
- 在第 15-24 行的 `showMessage` 函数中被使用

---

### 第 8 行：获取角色选择单选按钮组
```javascript
  const roleInputs = document.querySelectorAll('input[name="role"]');
```
**类型**：DOM 查询 + 常量声明
**作用**：获取所有角色选择单选按钮（学生/商家）
**联动关系**：
- 依赖 HTML 中所有 `name="role"` 的 input 元素
- 在第 28-54 行用于绑定 `change` 事件，实现角色切换功能

---

### 第 9 行：获取学生字段容器
```javascript
  const studentFields = document.getElementById('studentFields');
```
**类型**：DOM 查询 + 常量声明
**作用**：获取学生注册字段的容器元素
**联动关系**：
- 依赖 HTML 中 ID 为 `studentFields` 的元素
- 在第 32、43 行用于显示/隐藏学生字段

---

### 第 10 行：获取商家字段容器
```javascript
  const merchantFields = document.getElementById('merchantFields');
```
**类型**：DOM 查询 + 常量声明
**作用**：获取商家注册字段的容器元素
**联动关系**：
- 依赖 HTML 中 ID 为 `merchantFields` 的元素
- 在第 33、44 行用于显示/隐藏商家字段

---

### 第 11 行：获取发送验证码按钮
```javascript
  const sendCodeBtn = document.getElementById('sendCodeBtn');
```
**类型**：DOM 查询 + 常量声明
**作用**：获取发送验证码按钮元素
**联动关系**：
- 依赖 HTML 中 ID 为 `sendCodeBtn` 的按钮元素
- 在第 58 行用于绑定 `click` 事件监听器

---

### 第 14-15 行：showMessage 函数定义开始
```javascript
  // 显示消息函数
  // 创建时间: 2025-01-26
  function showMessage(text, type) {
```
**类型**：函数声明
**作用**：定义一个用于显示提示消息的函数
**参数**：
- `text`：要显示的消息文本
- `type`：消息类型（如 'success'、'error'）
**联动关系**：
- 在第 16-23 行实现函数体
- 在多个地方被调用（第 63、68、86、90、94、114、120、139、145、160、193、201、206 行）

---

### 第 16 行：设置消息文本内容
```javascript
    messageDiv.textContent = text;
```
**类型**：DOM 属性赋值
**作用**：将传入的文本设置到消息显示区域
**联动关系**：
- 使用第 7 行获取的 `messageDiv` 元素
- 使用函数参数 `text`

---

### 第 17 行：设置消息样式类
```javascript
    messageDiv.className = 'message ' + type;
```
**类型**：字符串拼接 + DOM 属性赋值
**作用**：设置消息元素的 CSS 类名，用于样式控制
**联动关系**：
- 使用函数参数 `type`（如 'success'、'error'）
- 拼接成 'message success' 或 'message error' 格式
- 依赖 CSS 中对应的样式类

---

### 第 18 行：显示消息元素
```javascript
    messageDiv.style.display = 'block';
```
**类型**：DOM 样式属性赋值
**作用**：将消息元素设置为可见（display: block）
**联动关系**：
- 与第 22 行形成显示/隐藏的配对关系

---

### 第 21-23 行：自动隐藏消息（3秒后）
```javascript
    // 3秒后自动隐藏
    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 3000);
```
**类型**：定时器函数（setTimeout）+ 箭头函数
**作用**：3 秒后自动隐藏消息
**联动关系**：
- 使用箭头函数作为回调
- 3000 毫秒（3秒）后执行隐藏操作
- 与第 18 行形成显示/隐藏的配对

---

### 第 26-28 行：角色切换处理开始
```javascript
  // 角色切换处理
  // 修改时间: 2025-01-26
  roleInputs.forEach(input => {
```
**类型**：数组方法（forEach）+ 箭头函数
**作用**：遍历所有角色选择单选按钮，为每个按钮绑定事件
**联动关系**：
- 使用第 8 行获取的 `roleInputs` 节点列表
- `input` 是遍历的每个单选按钮元素

---

### 第 29 行：为每个单选按钮绑定 change 事件
```javascript
    input.addEventListener('change', function() {
```
**类型**：事件监听器
**作用**：当用户切换角色选择时触发
**联动关系**：
- 监听单选按钮的 `change` 事件
- 回调函数在第 30-52 行实现角色切换逻辑

---

### 第 30 行：判断是否选择学生角色
```javascript
      if (this.value === 'student') {
```
**类型**：条件判断语句
**作用**：检查当前选中的角色是否为 'student'
**联动关系**：
- `this` 指向触发事件的单选按钮元素
- `this.value` 获取选中按钮的值
- 决定执行学生注册逻辑（第 31-40 行）还是商家注册逻辑（第 41-52 行）

---

### 第 32 行：显示学生字段
```javascript
        studentFields.style.display = 'block';
```
**类型**：DOM 样式属性赋值
**作用**：显示学生注册字段容器
**联动关系**：
- 使用第 9 行获取的 `studentFields` 元素
- 与第 33 行形成显示/隐藏的配对

---

### 第 33 行：隐藏商家字段
```javascript
        merchantFields.style.display = 'none';
```
**类型**：DOM 样式属性赋值
**作用**：隐藏商家注册字段容器
**联动关系**：
- 使用第 10 行获取的 `merchantFields` 元素
- 与第 32 行形成显示/隐藏的配对

---

### 第 35-36 行：清除商家字段的必填验证
```javascript
        document.getElementById('merchantUsername').required = false;
        document.getElementById('inviteCode').required = false;
```
**类型**：DOM 属性赋值
**作用**：将商家字段的 `required` 属性设为 false，取消必填验证
**联动关系**：
- 依赖 HTML 中对应的表单元素
- 与第 50-51 行形成必填/非必填的切换

---

### 第 38-40 行：设置学生字段为必填
```javascript
        document.getElementById('email').required = true;
        document.getElementById('emailCode').required = true;
        document.getElementById('username').required = true;
```
**类型**：DOM 属性赋值
**作用**：将学生注册字段设置为必填
**联动关系**：
- 依赖 HTML 中对应的表单元素
- 与第 46-48 行形成必填/非必填的切换

---

### 第 41 行：else 分支（商家角色）
```javascript
      } else {
```
**类型**：条件语句的 else 分支
**作用**：处理商家角色选择的情况
**联动关系**：
- 与第 30 行的 if 语句配对
- 执行商家注册逻辑（第 42-52 行）

---

### 第 43-44 行：显示商家字段，隐藏学生字段
```javascript
        studentFields.style.display = 'none';
        merchantFields.style.display = 'block';
```
**类型**：DOM 样式属性赋值
**作用**：切换字段显示状态（与第 32-33 行相反）
**联动关系**：
- 与第 32-33 行形成对称的显示/隐藏逻辑

---

### 第 46-48 行：清除学生字段的必填验证
```javascript
        document.getElementById('email').required = false;
        document.getElementById('emailCode').required = false;
        document.getElementById('username').required = false;
```
**类型**：DOM 属性赋值
**作用**：将学生字段的 `required` 属性设为 false
**联动关系**：
- 与第 38-40 行形成对称的必填/非必填切换

---

### 第 50-51 行：设置商家字段为必填
```javascript
        document.getElementById('merchantUsername').required = true;
        document.getElementById('inviteCode').required = true;
```
**类型**：DOM 属性赋值
**作用**：将商家注册字段设置为必填
**联动关系**：
- 与第 35-36 行形成对称的必填/非必填切换

---

### 第 56-58 行：发送验证码按钮事件绑定
```javascript
  // 发送验证码按钮处理
  // 修改时间: 2025-01-26
  sendCodeBtn.addEventListener('click', async function() {
```
**类型**：事件监听器 + 异步函数声明
**作用**：为发送验证码按钮绑定点击事件，使用 async 函数以支持异步操作
**联动关系**：
- 使用第 11 行获取的 `sendCodeBtn` 元素
- `async` 关键字允许在函数内使用 `await`（第 75、83 行）

---

### 第 59 行：获取邮箱输入值
```javascript
    const email = document.getElementById('email').value.trim();
```
**类型**：DOM 查询 + 字符串方法（trim）
**作用**：获取邮箱输入框的值并去除首尾空格
**联动关系**：
- 依赖 HTML 中 ID 为 `email` 的输入框
- `trim()` 去除空格，避免用户误输入空格导致验证失败
- 在第 62、67 行用于验证

---

### 第 62-65 行：验证邮箱是否为空
```javascript
    if (!email) {
      showMessage('请先输入邮箱', 'error');
      return;
    }
```
**类型**：条件判断 + 函数调用 + 返回语句
**作用**：检查邮箱是否为空，如果为空则显示错误消息并终止函数执行
**联动关系**：
- 使用第 59 行获取的 `email` 变量
- 调用第 15 行定义的 `showMessage` 函数
- `return` 阻止后续代码执行

---

### 第 67-70 行：验证邮箱格式
```javascript
    if (!email.endsWith('@xmu.edu.my')) {
      showMessage('邮箱必须是 @xmu.edu.my 格式', 'error');
      return;
    }
```
**类型**：条件判断 + 字符串方法（endsWith）+ 函数调用
**作用**：验证邮箱是否以 '@xmu.edu.my' 结尾
**联动关系**：
- 使用 `endsWith()` 方法检查字符串后缀
- 如果格式不正确，调用 `showMessage` 显示错误并返回

---

### 第 74 行：try 块开始（异步请求）
```javascript
    try {
```
**类型**：异常处理语句（try-catch）
**作用**：开始异常处理块，捕获可能的网络错误
**联动关系**：
- 与第 92 行的 `catch` 块配对
- 包含第 75-91 行的异步请求代码

---

### 第 75 行：发送验证码 API 请求
```javascript
      const response = await fetch(`${window.API_BASE_URL}/api/auth/send-verification-code`, {
```
**类型**：异步函数调用（fetch）+ 模板字符串 + await
**作用**：向服务器发送 POST 请求获取验证码
**联动关系**：
- `fetch` 是浏览器原生 API，用于发送 HTTP 请求
- `window.API_BASE_URL` 是全局变量，存储 API 基础 URL
- 模板字符串 `${}` 用于字符串插值
- `await` 等待请求完成，返回 Response 对象
- 请求配置在第 76-80 行

---

### 第 76 行：设置请求方法
```javascript
        method: 'POST',
```
**类型**：对象属性
**作用**：指定 HTTP 请求方法为 POST
**联动关系**：
- 作为第 75 行 `fetch` 的第二个参数对象的属性

---

### 第 77-79 行：设置请求头
```javascript
        headers: {
          'Content-Type': 'application/json'
        },
```
**类型**：对象属性（嵌套对象）
**作用**：设置 HTTP 请求头，指定请求体为 JSON 格式
**联动关系**：
- 作为第 75 行 `fetch` 配置的一部分
- 与第 80 行的 JSON 数据格式匹配

---

### 第 80 行：设置请求体
```javascript
        body: JSON.stringify({ email: email })
```
**类型**：对象属性 + JSON 序列化
**作用**：将邮箱数据序列化为 JSON 字符串作为请求体
**联动关系**：
- `JSON.stringify()` 将对象转换为 JSON 字符串
- 使用第 59 行获取的 `email` 变量
- 作为第 75 行 `fetch` 配置的一部分

---

### 第 83 行：解析响应 JSON
```javascript
      const data = await response.json();
```
**类型**：异步方法调用 + await
**作用**：将服务器响应的 JSON 数据解析为 JavaScript 对象
**联动关系**：
- `response` 是第 75 行 `fetch` 返回的 Response 对象
- `response.json()` 返回 Promise，`await` 等待解析完成
- 解析后的数据在第 85、90 行使用

---

### 第 85-91 行：处理响应结果
```javascript
      if (data.status === 0) {
        showMessage('验证码已发送（功能待实现）', 'success');
        // TODO: 实现倒计时功能
        // 修改时间: 2025-01-26
      } else {
        showMessage(data.message || '发送验证码失败', 'error');
      }
```
**类型**：条件判断 + 函数调用 + 逻辑或运算符
**作用**：根据服务器返回的状态码显示成功或失败消息
**联动关系**：
- `data.status === 0` 表示成功（第 85 行）
- 成功时调用 `showMessage` 显示成功消息（第 86 行）
- 失败时显示错误消息，使用 `data.message` 或默认文本（第 90 行）
- `||` 运算符提供默认值

---

### 第 92-95 行：捕获异常
```javascript
    } catch (error) {
      console.error('发送验证码错误:', error);
      showMessage('网络错误，请稍后重试', 'error');
    }
```
**类型**：异常处理（catch）+ 控制台输出 + 函数调用
**作用**：捕获网络请求过程中的异常，记录错误并显示用户友好的错误消息
**联动关系**：
- 与第 74 行的 `try` 块配对
- `error` 是捕获的异常对象
- `console.error` 用于调试输出
- `showMessage` 向用户显示错误消息

---

### 第 98-100 行：注册表单提交事件绑定
```javascript
  // 处理注册表单提交
  // 修改时间: 2025-01-26 - 支持商家/非商家注册
  registerForm.addEventListener('submit', async function(e) {
```
**类型**：事件监听器 + 异步函数声明
**作用**：为注册表单绑定提交事件，使用 async 函数支持异步操作
**联动关系**：
- 使用第 6 行获取的 `registerForm` 元素
- `e` 是事件对象，在第 101 行使用

---

### 第 101 行：阻止表单默认提交
```javascript
    e.preventDefault(); // 阻止表单默认提交行为
```
**类型**：事件方法调用
**作用**：阻止浏览器默认的表单提交行为，改用 JavaScript 处理
**联动关系**：
- `e` 是第 100 行的事件对象
- 防止页面刷新，实现单页应用体验

---

### 第 105 行：获取选中的角色
```javascript
    const selectedRole = document.querySelector('input[name="role"]:checked').value;
```
**类型**：DOM 查询 + CSS 选择器 + 属性访问
**作用**：获取当前选中的角色单选按钮的值
**联动关系**：
- `:checked` 伪类选择器选中被选中的单选按钮
- `.value` 获取按钮的值（'student' 或 'merchant'）
- 在第 127、131、153 行使用

---

### 第 108-109 行：获取密码输入值
```javascript
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
```
**类型**：DOM 查询 + 属性访问
**作用**：获取密码和确认密码输入框的值
**联动关系**：
- 依赖 HTML 中对应的输入框元素
- 在第 113、119 行用于密码验证

---

### 第 113-116 行：验证密码长度
```javascript
    if (password.length < 6) {
      showMessage('密码长度至少为6个字符', 'error');
      return;
    }
```
**类型**：条件判断 + 字符串属性（length）+ 函数调用
**作用**：检查密码长度是否至少为 6 个字符
**联动关系**：
- 使用第 108 行获取的 `password` 变量
- `length` 属性获取字符串长度
- 验证失败时调用 `showMessage` 并返回

---

### 第 119-122 行：验证两次密码是否一致
```javascript
    if (password !== confirmPassword) {
      showMessage('两次输入的密码不一致', 'error');
      return;
    }
```
**类型**：条件判断 + 严格不等于运算符 + 函数调用
**作用**：检查密码和确认密码是否一致
**联动关系**：
- 使用第 108-109 行获取的两个密码变量
- `!==` 严格不等于运算符进行比较
- 不一致时显示错误消息并返回

---

### 第 126-129 行：初始化请求数据对象
```javascript
    let requestData = {
      role: selectedRole,
      password: password
    };
```
**类型**：变量声明 + 对象字面量
**作用**：创建注册请求的数据对象，包含角色和密码
**联动关系**：
- `selectedRole` 来自第 105 行
- `password` 来自第 108 行
- 根据角色不同，后续会添加不同字段（第 131-166 行）

---

### 第 131 行：判断是否为学生角色
```javascript
    if (selectedRole === 'student') {
```
**类型**：条件判断语句
**作用**：检查选中的角色是否为学生
**联动关系**：
- 使用第 105 行获取的 `selectedRole`
- 决定执行学生注册逻辑（第 132-151 行）还是商家注册逻辑（第 153-166 行）

---

### 第 133-135 行：获取学生注册字段值
```javascript
      const email = document.getElementById('email').value.trim();
      const username = document.getElementById('username').value.trim();
      const emailCode = document.getElementById('emailCode').value.trim();
```
**类型**：DOM 查询 + 字符串方法（trim）
**作用**：获取学生注册所需的邮箱、用户名和验证码，并去除首尾空格
**联动关系**：
- 依赖 HTML 中对应的输入框元素
- `trim()` 去除空格
- 在第 138、144、149-151 行使用

---

### 第 138-141 行：验证学生字段是否完整
```javascript
      if (!email || !username || !emailCode) {
        showMessage('请填写所有必填字段', 'error');
        return;
      }
```
**类型**：条件判断 + 逻辑或运算符 + 函数调用
**作用**：检查学生注册字段是否都已填写
**联动关系**：
- 使用第 133-135 行获取的字段值
- `||` 运算符：任一字段为空则返回 true
- `!` 取反运算符：检查字段是否为空

---

### 第 144-147 行：验证学生邮箱格式
```javascript
      if (!email.endsWith('@xmu.edu.my')) {
        showMessage('邮箱必须是 @xmu.edu.my 格式', 'error');
        return;
      }
```
**类型**：条件判断 + 字符串方法 + 函数调用
**作用**：验证学生邮箱格式是否正确
**联动关系**：
- 使用第 133 行获取的 `email` 变量
- 与第 67-70 行的验证逻辑相同

---

### 第 149-151 行：添加学生注册数据到请求对象
```javascript
      requestData.email = email;
      requestData.username = username;
      requestData.verification_code = emailCode;
```
**类型**：对象属性赋值
**作用**：将学生注册字段添加到请求数据对象中
**联动关系**：
- `requestData` 是第 126 行创建的对象
- 使用第 133-135 行获取的字段值
- 在第 176 行作为请求体发送

---

### 第 153 行：判断是否为商家角色
```javascript
    } else if (selectedRole === 'merchant') {
```
**类型**：条件判断语句（else if）
**作用**：检查选中的角色是否为商家
**联动关系**：
- 与第 131 行的 if 语句配对
- 执行商家注册逻辑（第 154-166 行）

---

### 第 155-156 行：获取商家注册字段值
```javascript
      const username = document.getElementById('merchantUsername').value.trim();
      const inviteCode = document.getElementById('inviteCode').value.trim();
```
**类型**：DOM 查询 + 字符串方法（trim）
**作用**：获取商家注册所需的用户名和邀请码，并去除首尾空格
**联动关系**：
- 依赖 HTML 中对应的输入框元素
- 在第 159、164-165 行使用

---

### 第 159-162 行：验证商家字段是否完整
```javascript
      if (!username || !inviteCode) {
        showMessage('请填写所有必填字段', 'error');
        return;
      }
```
**类型**：条件判断 + 逻辑或运算符 + 函数调用
**作用**：检查商家注册字段是否都已填写
**联动关系**：
- 使用第 155-156 行获取的字段值
- 与第 138-141 行的验证逻辑类似

---

### 第 164-165 行：添加商家注册数据到请求对象
```javascript
      requestData.username = username;
      requestData.invite_code = inviteCode;
```
**类型**：对象属性赋值
**作用**：将商家注册字段添加到请求数据对象中
**联动关系**：
- `requestData` 是第 126 行创建的对象
- 使用第 155-156 行获取的字段值
- 在第 176 行作为请求体发送

---

### 第 170 行：try 块开始（注册请求）
```javascript
    try {
```
**类型**：异常处理语句（try-catch）
**作用**：开始异常处理块，捕获注册请求可能的错误
**联动关系**：
- 与第 203 行的 `catch` 块配对
- 包含第 171-202 行的异步注册请求代码

---

### 第 171 行：发送注册 API 请求
```javascript
      const response = await fetch(`${window.API_BASE_URL}/api/auth/register`, {
```
**类型**：异步函数调用（fetch）+ 模板字符串 + await
**作用**：向服务器发送 POST 请求进行用户注册
**联动关系**：
- `fetch` 发送 HTTP 请求
- `window.API_BASE_URL` 是全局 API 基础 URL
- 请求配置在第 172-176 行
- `await` 等待请求完成

---

### 第 172-175 行：设置注册请求配置
```javascript
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
```
**类型**：对象属性
**作用**：设置注册请求的方法和请求头
**联动关系**：
- 作为第 171 行 `fetch` 的配置对象
- 与第 75-79 行的配置类似

---

### 第 176 行：设置注册请求体
```javascript
        body: JSON.stringify(requestData)
```
**类型**：对象属性 + JSON 序列化
**作用**：将注册数据序列化为 JSON 字符串作为请求体
**联动关系**：
- `requestData` 是第 126-166 行构建的数据对象
- `JSON.stringify()` 转换为 JSON 字符串
- 作为第 171 行 `fetch` 配置的一部分

---

### 第 179 行：解析注册响应 JSON
```javascript
      const data = await response.json();
```
**类型**：异步方法调用 + await
**作用**：将服务器响应的 JSON 数据解析为 JavaScript 对象
**联动关系**：
- `response` 是第 171 行 `fetch` 返回的 Response 对象
- 解析后的数据在第 181、200-201 行使用

---

### 第 181 行：判断注册是否成功
```javascript
      if (data.status === 0) {
```
**类型**：条件判断语句
**作用**：检查服务器返回的状态码，0 表示成功
**联动关系**：
- `data` 是第 179 行解析的响应数据
- 成功时执行第 182-198 行，失败时执行第 199-202 行

---

### 第 184-186 行：保存 token 到本地存储
```javascript
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
```
**类型**：条件判断 + Web Storage API
**作用**：如果响应中包含 token，将其保存到浏览器的 localStorage
**联动关系**：
- `data.token` 是服务器返回的认证令牌
- `localStorage.setItem()` 将数据持久化存储
- token 用于后续的 API 请求认证

---

### 第 189-191 行：保存用户信息到本地存储
```javascript
        if (data.data) {
          localStorage.setItem('user', JSON.stringify(data.data));
        }
```
**类型**：条件判断 + Web Storage API + JSON 序列化
**作用**：如果响应中包含用户数据，将其序列化后保存到 localStorage
**联动关系**：
- `data.data` 是服务器返回的用户信息对象
- `JSON.stringify()` 将对象转换为字符串存储
- 用户信息可用于页面显示或其他功能

---

### 第 193 行：显示注册成功消息
```javascript
        showMessage('注册成功！正在跳转...', 'success');
```
**类型**：函数调用
**作用**：显示注册成功的提示消息
**联动关系**：
- 调用第 15 行定义的 `showMessage` 函数
- 消息类型为 'success'

---

### 第 196-198 行：延迟跳转到登录页
```javascript
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1000);
```
**类型**：定时器函数 + 箭头函数 + 全局对象属性赋值
**作用**：1 秒后跳转到登录页面
**联动关系**：
- `setTimeout` 延迟执行
- 箭头函数作为回调
- `window.location.href` 改变当前页面 URL，触发页面跳转
- 1000 毫秒 = 1 秒

---

### 第 199-202 行：处理注册失败
```javascript
      } else {
        // 注册失败
        showMessage(data.message || '注册失败，请稍后重试', 'error');
      }
```
**类型**：条件语句的 else 分支 + 函数调用 + 逻辑或运算符
**作用**：当注册失败时显示错误消息
**联动关系**：
- 与第 181 行的 if 语句配对
- `data.message` 是服务器返回的错误消息
- `||` 提供默认错误消息
- 调用 `showMessage` 显示错误

---

### 第 203-207 行：捕获注册请求异常
```javascript
    } catch (error) {
      // 网络错误处理
      console.error('注册错误:', error);
      showMessage('网络错误，请稍后重试', 'error');
    }
```
**类型**：异常处理（catch）+ 控制台输出 + 函数调用
**作用**：捕获注册请求过程中的异常，记录错误并显示用户友好的错误消息
**联动关系**：
- 与第 170 行的 `try` 块配对
- `error` 是捕获的异常对象
- `console.error` 用于调试
- `showMessage` 向用户显示错误消息

---

### 第 209 行：DOMContentLoaded 回调函数结束
```javascript
});
```
**类型**：函数闭合括号
**作用**：结束第 5 行开始的 `DOMContentLoaded` 事件监听器的回调函数
**联动关系**：
- 与第 5 行的 `document.addEventListener` 配对
- 闭合整个脚本的主要执行逻辑

---

### 第 211 行：文件结束（空行）
```javascript

```
**类型**：空行
**作用**：文件结束标记
**联动关系**：无

---

## 代码结构总结

### 主要功能模块：
1. **DOM 元素获取**（第 6-11 行）：获取页面中的表单元素
2. **消息显示函数**（第 15-24 行）：统一的提示消息显示机制
3. **角色切换处理**（第 28-54 行）：根据用户选择的角色显示/隐藏相应字段
4. **验证码发送**（第 58-96 行）：发送邮箱验证码的异步请求
5. **注册表单提交**（第 100-208 行）：处理注册表单的提交，包括验证和数据发送

### 关键联动关系：
- **事件驱动**：所有功能都通过事件监听器触发（DOMContentLoaded、click、submit、change）
- **异步处理**：使用 async/await 处理网络请求
- **数据流**：用户输入 → 验证 → 构建请求数据 → 发送请求 → 处理响应 → 更新页面
- **状态管理**：通过 DOM 元素的显示/隐藏和 required 属性管理表单状态

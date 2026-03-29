一句话总览（先把全局捋直）

这整个 login.js 就干一件事：

👉 等页面加载完
👉 监听“登录按钮被点”
👉 拿输入框里的学号和密码
👉 发 POST 请求给 /api/login
👉 根据后端返回结果，提示 + 跳转

没有任何“魔法”。

第一刀：最容易让人窒息的地方
document.addEventListener('DOMContentLoaded', function() {
  ...
});

你现在的真实感受

“？？？我啥都没干，怎么就开始监听了？？？”

人话解释

等 HTML 全部加载完，再执行里面的代码。

等价于你在 C/C++ 里写：

int main() {
  // 页面加载完之后才开始干活
}


没有它，JS 可能找不到 DOM 元素。

第二刀：这两行你不用怕
const loginForm = document.getElementById('loginForm');
const messageDiv = document.getElementById('message');

人话

loginForm → <form id="loginForm">

messageDiv → 用来显示“登录成功 / 失败”的那个 div

本质就是：给 HTML 元素起个变量名

第三刀：showMessage 不是重点（可以先忽略）
function showMessage(text, type) {
  ...
}


这是纯 UI 辅助函数，逻辑价值 ≈ 0
你现在完全可以脑补成一句话：

👉 “在页面上显示一句提示，3 秒后消失”

看不懂就先跳过，完全不影响你理解登录流程。

第四刀（核心）：真正的“登录逻辑”只在这 1 个地方
loginForm.addEventListener('submit', async function(e) {

这行的真实含义

当用户点了「登录按钮」时，执行下面这坨代码

你可以翻译成伪代码：

当 表单被提交 时：
    不要刷新页面
    读取学号和密码
    发请求给后端
    根据返回结果决定干啥

第五刀：这行你必须吃透（前端最关键的一行）
e.preventDefault();

不理解这行 = 永远觉得前端很玄学

默认行为：

<form> 一提交 → 浏览器刷新页面

这行的作用：

我不要你刷新

我要用 JS 自己控制登录流程

👉 类似于你在后端里拦截请求，不让框架自动处理。

第六刀：真正的数据来源（很重要）
const studentId = document.getElementById('studentId').value.trim();
const password = document.getElementById('password').value;

人话

从输入框里 读值

没有任何“网络”

没有任何“后端”

就是：

studentId = 用户输入的学号
password  = 用户输入的密码






=========================================
事件入口：
- DOMContentLoaded（页面初始化）

初始化阶段：
- 获取 loginForm / message DOM
- 定义 showMessage（UI 提示工具函数）

用户事件：
- 监听 loginForm submit
- 阻止默认提交

输入处理：
- 读取 studentId / password
- 前端非空校验（UX）

网络请求：
- POST /api/login
- 请求体 JSON：
  { student_id, password }

响应处理：
- 解析 response → data 对象

分支逻辑：
- status === 0：
    - 保存 token（登录态）
    - 保存 user 信息
    - 显示成功提示
    - 跳转主页
- status !== 0：
    - 显示业务失败信息

异常处理：
- catch 网络 / 系统错误
- 显示网络异常提示

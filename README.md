# Steam 评论监控 MVP

免费版 Steam 游戏评论舆情监控系统，部署在 Vercel + MongoDB Atlas。

## 功能特性

- ✅ 监控最多 5 款游戏
- ✅ 每日自动更新评论数据
- ✅ 简单情感分析
- ✅ 网页端增删游戏
- ✅ 实时刷新评论
- ✅ 响应式设计

## 技术栈

- Next.js 14
- React 18
- MongoDB Atlas (M0 免费版)
- Vercel (Hobby 免费版)

## 部署步骤

### 1. 准备 MongoDB

1. 访问 https://www.mongodb.com/atlas
2. 注册账号，创建免费 Cluster (M0)
3. 创建数据库用户
4. 获取连接字符串（格式如下）：
   ```
   mongodb+srv://username:password@cluster0.xxx.mongodb.net/steam_reviews?retryWrites=true&w=majority
   ```

### 2. 部署到 Vercel

**方式一：一键部署**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

**方式二：命令行**

```bash
# 克隆代码
git clone https://github.com/yourusername/steam-reviews-mvp.git
cd steam-reviews-mvp

# 安装依赖
npm install

# 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local，填入你的 MONGODB_URI

# 部署
vercel --prod
```

### 3. 配置环境变量

在 Vercel Dashboard 中添加：

```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxx.mongodb.net/steam_reviews?retryWrites=true&w=majority
```

### 4. 初始化数据（可选）

添加默认监控的游戏：

```bash
# 本地运行初始化脚本
npm run dev
# 然后访问 http://localhost:3000 添加游戏
```

## 使用说明

### 添加游戏

1. 打开网站
2. 在左侧输入 AppID 和游戏名称
3. 点击"添加"

### 查看评论

1. 点击左侧游戏卡片
2. 右侧显示评论统计和列表
3. 点击"立即更新"刷新数据

### 删除游戏

1. 点击游戏卡片上的"删除"按钮
2. 确认删除

## 数据限制

| 限制项 | 免费版限制 | 说明 |
|--------|-----------|------|
| 监控游戏数 | 5 款 | 超出需删除旧游戏 |
| 评论存储 | 每游戏 100 条 | 自动清理旧数据 |
| 统计历史 | 30 天 | 自动清理 |
| 存储空间 | < 100MB | 远低于 512MB 限制 |

## 定时任务

每天 UTC 9:00（北京时间 17:00）自动更新所有游戏评论。

手动触发：
```bash
curl https://your-app.vercel.app/api/cron/daily
```

## 升级专业版

需要更多功能？可以升级到专业版：

- 无限游戏数量
- 完整历史数据
- AI 情感分析
- 告警通知（Telegram/邮件）
- 竞品对比分析

联系开发者了解详情。

## 开发

```bash
# 本地开发
npm run dev

# 构建
npm run build
```

## License

MIT

## 作者

Baby 🐾

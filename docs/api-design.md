# API 接口设计

> 最后更新：2026-03-31，与实际代码实现保持一致

## 全局约定

| 项目 | 值 |
|------|-----|
| 基础路径 | `/api/v1` |
| 协议 | HTTP (开发) / HTTPS (生产) |
| Content-Type | `application/json`（上传接口为 `multipart/form-data`） |
| 认证方式 | JWT Bearer Token — `Authorization: Bearer <token>` |
| 令牌有效期 | 7 天 |
| 签名算法 | HS256 (jose) |
| CORS | 允许方法 GET/POST/PUT/DELETE/OPTIONS，预检缓存 86400s |

## 速率限制

所有响应均包含速率限制头：

| Header | 说明 |
|--------|------|
| `X-RateLimit-Limit` | 窗口内最大请求数 |
| `X-RateLimit-Remaining` | 剩余请求数 |
| `X-RateLimit-Reset` | 窗口重置时间戳（秒） |
| `Retry-After` | 被限流时需等待的秒数 |

| 路由匹配 | 限流预设 | 窗口 | 最大请求数 |
|-----------|----------|------|------------|
| `/api/v1/auth/*` | authLimiter | 60 秒 | 10 |
| `/api/v1/uploads/*` | uploadLimiter | 60 秒 | 20 |
| `/api/v1/*` | apiLimiter | 60 秒 | 100 |

超出限制返回 HTTP 429：

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests, please try again later"
  }
}
```

## 统一响应格式

### 成功

```json
{
  "data": { ... }
}
```

或分页：

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 错误

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

### 常用 HTTP 状态码

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 无内容 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 冲突（唯一约束等业务规则） |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

---

## 1. 健康检查

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/v1/health` | 无 | 返回 `{ status: "ok" }` |

---

## 2. 认证 `/api/v1/auth`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/register` | 无 | 注册新用户（需管理员审批） |
| POST | `/login` | 无 | 登录获取 JWT |
| POST | `/logout` | 是 | 登出（无状态，客户端清除 token） |
| GET | `/me` | 是 | 获取当前用户信息 |

### POST `/register`

请求体：

```json
{
  "username": "string (必填)",
  "email": "string (必填)",
  "password": "string (必填)",
  "displayName": "string (必填)"
}
```

响应 201：`{ message: "注册成功，请等待管理员审批" }`

### POST `/login`

请求体：

```json
{
  "login": "string (用户名或邮箱)",
  "password": "string"
}
```

响应 200：

```json
{
  "token": "jwt_string",
  "expiresIn": 604800,
  "user": { "id": 1, "username": "...", "displayName": "...", "isAdmin": false }
}
```

---

## 3. 用户 `/api/v1/users`

> 所有接口均需认证

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/` | 管理员 | 列出用户（支持 `status` 过滤） |
| GET | `/family-members` | 已认证 | 获取已批准的家庭成员 |
| GET | `/me/preferences` | 已认证 | 获取当前用户饮食偏好 |
| PUT | `/me/preferences` | 已认证 | 更新饮食偏好 |
| GET | `/preferences/all` | 已认证 | 获取所有家庭成员偏好 |
| POST | `/` | 管理员 | 创建用户 |
| PUT | `/me/password` | 已认证 | 修改自己密码 |
| PUT | `/:userId` | 本人或管理员 | 更新用户信息 |
| PUT | `/:userId/approve` | 管理员 | 审批用户 `{ action: "approve" | "reject" }` |
| PUT | `/:userId/reset-password` | 管理员 | 重置用户密码 |

### PUT `/me/preferences`

```json
{
  "dietaryNotes": "string (可选，饮食备注)",
  "allergenIds": [1, 2, 3]
}
```

---

## 4. 菜品 `/api/v1/dishes`

> 所有接口均需认证。变更操作（PUT/DELETE/上传照片）需要**菜品创建者或管理员**权限。

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/search` | 已认证 | 搜索菜品（Query: `q`, `limit`，最大 30） |
| GET | `/favorites` | 已认证 | 获取当前用户收藏菜品 |
| GET | `/favorites/all` | 已认证 | 获取所有家庭成员收藏 |
| GET | `/` | 已认证 | 列表（Query: `keyword`, `tagId`, `ingredientId`, `cookingMethodId`, `page`, `pageSize`） |
| GET | `/:dishId` | 已认证 | 详情 |
| POST | `/` | 已认证 | 创建菜品 |
| PUT | `/:dishId` | 创建者/管理员 | 更新菜品 |
| POST | `/:dishId/clone` | 已认证 | 克隆菜品 |
| DELETE | `/:dishId` | 创建者/管理员 | 删除菜品 |
| POST | `/:dishId/photos` | 创建者/管理员 | 上传菜品照片（multipart） |
| PUT | `/:dishId/default-photo` | 创建者/管理员 | 设置默认照片 `{ photoId }` |
| DELETE | `/:dishId/photos/:photoId` | 创建者/管理员 | 删除照片 |

### POST `/`

```json
{
  "name": "string (必填)",
  "description": "string (Markdown，可选)",
  "pinyin": "string (可选)",
  "pinyinInitial": "string (可选)",
  "ingredientIds": [1, 2],
  "cookingMethodIds": [1],
  "tagIds": [1, 2]
}
```

---

## 5. 食材 `/api/v1/ingredients`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/` | 已认证 | 搜索（Query: `keyword`, `categoryId`） |
| GET | `/grouped` | 已认证 | 按分类分组 |
| POST | `/` | 管理员 | 创建食材 `{ name, categoryId? }` |
| PUT | `/:id` | 管理员 | 更新食材 |
| DELETE | `/:id` | 管理员 | 删除食材 |

---

## 6. 食材分类 `/api/v1/ingredient-categories`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/` | 已认证 | 列出所有分类 |
| POST | `/` | 管理员 | 创建 `{ name, sortOrder? }` |
| PUT | `/:id` | 管理员 | 更新 |
| DELETE | `/:id` | 管理员 | 删除 |

---

## 7. 烹饪方式 `/api/v1/cooking-methods`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/` | 已认证 | 列出全部 |
| POST | `/` | 管理员 | 创建 `{ name }` |
| PUT | `/:id` | 管理员 | 更新 |
| DELETE | `/:id` | 管理员 | 删除 |

---

## 8. 标签 `/api/v1/tags`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/` | 已认证 | 列出全部 |
| POST | `/` | 管理员 | 创建 `{ name }` |
| PUT | `/:id` | 管理员 | 更新 |
| DELETE | `/:id` | 管理员 | 删除 |

---

## 9. 菜单 `/api/v1/menus`

> 变更操作需**菜单创建者**权限。

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/` | 已认证 | 列表（Query: `status`, `page`, `pageSize`） |
| GET | `/:menuId` | 参与者 | 详情 |
| POST | `/` | 已认证 | 创建菜单 |
| PUT | `/:menuId` | 创建者 | 更新基本信息 |
| DELETE | `/:menuId` | 创建者 | 删除菜单 |
| POST | `/:menuId/dishes` | 创建者 | 添加菜品 `{ dishId, photoUrl?, sortOrder? }` |
| DELETE | `/:menuId/dishes/:menuDishId` | 创建者 | 移除菜品 |
| PUT | `/:menuId/dishes/reorder` | 创建者 | 重排菜品顺序 |
| PUT | `/:menuId/invitees` | 创建者 | 更新受邀人 `{ inviteeIds[] }` |
| PUT | `/:menuId/collaborators` | 创建者 | 更新协作者 `{ collaboratorIds[] }` |
| POST | `/:menuId/publish` | 创建者 | 发布菜单 |
| POST | `/:menuId/close-selection` | 创建者 | 结束选菜 |
| POST | `/:menuId/start-cooking` | 创建者 | 开始做饭 |
| POST | `/:menuId/complete` | 创建者 | 完成菜单 |
| GET | `/:menuId/selections/me` | 参与者 | 获取个人选菜 |
| PUT | `/:menuId/selections` | 参与者 | 提交/更新选菜 `{ menuDishIds[] }` |
| GET | `/:menuId/selections/summary` | 参与者 | 选菜汇总 |
| GET | `/:menuId/print` | 参与者 | 打印数据 |
| GET | `/:menuId/allergen-warnings` | 已认证 | 过敏原冲突警告 |

### POST `/`

```json
{
  "title": "string (必填)",
  "mealType": "breakfast | lunch | dinner | afternoon_tea | late_night",
  "mealTime": "ISO 8601 日期时间",
  "deadline": "ISO 8601 日期时间",
  "inviteeIds": [1, 2, 3],
  "collaboratorIds": [4],
  "dishes": [{ "dishId": 1, "sortOrder": 1 }]
}
```

### 菜单状态流转

```
draft → published → selection_closed → cooking → completed
```

---

## 10. 通知 `/api/v1/notifications`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/` | 已认证 | 列表（分页） |
| GET | `/unread-count` | 已认证 | 未读计数 |
| PUT | `/read-all` | 已认证 | 全部标为已读 |
| PUT | `/:notificationId/read` | 已认证 | 单条标为已读 |

---

## 11. 轮询 `/api/v1/poll`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/` | 已认证 | 长轮询新通知（Query: `since`） |

响应：

```json
{
  "notifications": [...],
  "unreadCount": 5,
  "serverTime": "2026-03-31T12:00:00.000Z"
}
```

---

## 12. 上传 `/api/v1/uploads`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/image` | 已认证 | 上传图片（multipart/form-data） |

约束：

- 最大 5 MB
- 仅允许 JPG、PNG、WebP
- Magic bytes 校验防止伪造文件类型

响应 201：

```json
{
  "url": "/api/v1/photos/uploads/{imageId}"
}
```

---

## 接口统计

| 分类 | 数量 |
|------|------|
| 公开接口 | 4（注册、登录、健康检查） |
| 已认证接口 | ~60 |
| 管理员接口 | ~15 |
| 合计 | ~77 |

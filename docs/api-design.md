# API 接口文档

## 基础信息

- Base URL: `/api/v1`
- 认证方式: JWT Bearer Token（`Authorization: Bearer <token>`）
- 响应格式: JSON
- 通用错误响应格式:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

- 通用分页参数: `?page=1&pageSize=20`
- 通用分页响应:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 1. 认证模块 `/api/v1/auth`

### 1.1 注册

```
POST /auth/register
```

**无需认证**

请求体:
```json
{
  "username": "string (必填, 3-30字符)",
  "email": "string (必填, 邮箱格式)",
  "password": "string (必填, 6-50字符)",
  "displayName": "string (必填, 显示名称)"
}
```

响应 `201`:
```json
{
  "message": "注册成功，等待管理员审批"
}
```

### 1.2 登录

```
POST /auth/login
```

**无需认证**

请求体:
```json
{
  "login": "string (必填, 用户名或邮箱)",
  "password": "string (必填)"
}
```

响应 `200`:
```json
{
  "token": "jwt_token_string",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "displayName": "string",
    "familyRole": "string|null",
    "isAdmin": false,
    "avatarUrl": "string|null"
  }
}
```

### 1.3 登出

```
POST /auth/logout
```

**需要认证**

响应 `200`:
```json
{
  "message": "已登出"
}
```

### 1.4 获取当前用户信息

```
GET /auth/me
```

**需要认证**

响应 `200`:
```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "displayName": "string",
  "familyRole": "string|null",
  "isAdmin": false,
  "avatarUrl": "string|null"
}
```

---

## 2. 用户管理模块 `/api/v1/users`

### 2.1 获取所有用户（管理员）

```
GET /users?status=pending&page=1&pageSize=20
```

**需要认证 + 管理员权限**

查询参数:
- `status`: `pending` | `approved` | `rejected` | 不传则返回全部

响应 `200`:
```json
{
  "data": [
    {
      "id": "string",
      "username": "string",
      "email": "string",
      "displayName": "string",
      "familyRole": "string|null",
      "isAdmin": false,
      "status": "pending",
      "createdAt": "ISO8601"
    }
  ],
  "pagination": { ... }
}
```

### 2.2 审批用户（管理员）

```
PUT /users/:userId/approve
```

**需要认证 + 管理员权限**

请求体:
```json
{
  "action": "approve | reject"
}
```

响应 `200`:
```json
{
  "message": "操作成功",
  "user": { ... }
}
```

### 2.3 创建用户（管理员直接添加）

```
POST /users
```

**需要认证 + 管理员权限**

请求体:
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "displayName": "string",
  "familyRole": "string|null"
}
```

响应 `201`:
```json
{
  "user": { ... }
}
```

### 2.4 更新用户信息

```
PUT /users/:userId
```

**需要认证**（自己或管理员）

请求体:
```json
{
  "displayName": "string",
  "familyRole": "string",
  "avatarUrl": "string"
}
```

### 2.5 重置用户密码（管理员）

```
PUT /users/:userId/reset-password
```

**需要认证 + 管理员权限**

请求体:
```json
{
  "newPassword": "string"
}
```

### 2.6 修改自己的密码

```
PUT /users/me/password
```

**需要认证**

请求体:
```json
{
  "oldPassword": "string",
  "newPassword": "string"
}
```

### 2.7 获取所有已审批家庭成员

```
GET /users/family-members
```

**需要认证**

响应 `200`:
```json
{
  "data": [
    {
      "id": "string",
      "displayName": "string",
      "familyRole": "string",
      "avatarUrl": "string|null"
    }
  ]
}
```

---

## 3. 菜品模块 `/api/v1/dishes`

### 3.1 获取菜品列表

```
GET /dishes?keyword=红烧&tagIds=tag1,tag2&page=1&pageSize=20
```

**需要认证**

查询参数:
- `keyword`: 菜品名称模糊搜索
- `tagIds`: 按标签筛选（逗号分隔）
- `ingredientIds`: 按原材料筛选
- `cookingMethodIds`: 按烹饪方式筛选

响应 `200`:
```json
{
  "data": [
    {
      "id": "string",
      "name": "string",
      "description": "string|null",
      "defaultPhoto": {
        "id": "string",
        "url": "string"
      },
      "tags": [{ "id": "string", "name": "string" }],
      "ingredients": [{ "id": "string", "name": "string" }],
      "cookingMethods": [{ "id": "string", "name": "string" }],
      "selectionCount": 10,
      "createdAt": "ISO8601"
    }
  ],
  "pagination": { ... }
}
```

### 3.2 获取单个菜品

```
GET /dishes/:dishId
```

**需要认证**

响应 `200`:
```json
{
  "id": "string",
  "name": "string",
  "description": "string|null",
  "defaultPhotoId": "string|null",
  "photos": [
    { "id": "string", "url": "string", "createdAt": "ISO8601" }
  ],
  "tags": [{ "id": "string", "name": "string" }],
  "ingredients": [{ "id": "string", "name": "string", "category": "string" }],
  "cookingMethods": [{ "id": "string", "name": "string" }],
  "createdBy": { "id": "string", "displayName": "string" },
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### 3.3 新增菜品

```
POST /dishes
```

**需要认证**

请求体:
```json
{
  "name": "string (必填)",
  "description": "string",
  "ingredientIds": ["string"],
  "cookingMethodIds": ["string"],
  "tagIds": ["string"],
  "defaultPhotoId": "string|null"
}
```

响应 `201`:
```json
{
  "dish": { ... }
}
```

### 3.4 更新菜品

```
PUT /dishes/:dishId
```

**需要认证**

请求体: 同新增（部分更新）

### 3.5 删除菜品

```
DELETE /dishes/:dishId
```

**需要认证**（创建者或管理员）

### 3.6 上传菜品照片

```
POST /dishes/:dishId/photos
```

**需要认证**

请求体: `multipart/form-data`
- `photo`: 图片文件 (JPG/PNG/WebP, 最大5MB)

响应 `201`:
```json
{
  "photo": {
    "id": "string",
    "url": "string",
    "fileSize": 123456,
    "mimeType": "image/jpeg"
  }
}
```

### 3.7 设置默认照片

```
PUT /dishes/:dishId/default-photo
```

**需要认证**

请求体:
```json
{
  "photoId": "string"
}
```

### 3.8 删除菜品照片

```
DELETE /dishes/:dishId/photos/:photoId
```

**需要认证**

---

## 4. 原材料模块 `/api/v1/ingredients`

### 4.1 搜索原材料

```
GET /ingredients?keyword=niu&categoryId=cat_meat&page=1&pageSize=50
```

**需要认证**

查询参数:
- `keyword`: 支持汉字/拼音/拼音首字母模糊搜索
- `categoryId`: 按分类筛选

### 4.2 获取所有原材料（按分类分组）

```
GET /ingredients/grouped
```

**需要认证**

响应 `200`:
```json
{
  "data": [
    {
      "category": { "id": "string", "name": "肉类" },
      "ingredients": [
        { "id": "string", "name": "牛肉", "pinyin": "niurou" }
      ]
    }
  ]
}
```

### 4.3 新增原材料

```
POST /ingredients
```

**需要认证**

请求体:
```json
{
  "name": "string (必填)",
  "categoryId": "string"
}
```

> 拼音和拼音首字母由后端自动生成

### 4.4 更新原材料

```
PUT /ingredients/:id
```

### 4.5 删除原材料

```
DELETE /ingredients/:id
```

**需要认证 + 管理员权限**

---

## 5. 原材料分类 `/api/v1/ingredient-categories`

### 5.1 获取所有分类

```
GET /ingredient-categories
```

### 5.2 新增分类

```
POST /ingredient-categories
```

请求体:
```json
{
  "name": "string",
  "sortOrder": 0
}
```

### 5.3 更新分类

```
PUT /ingredient-categories/:id
```

### 5.4 删除分类

```
DELETE /ingredient-categories/:id
```

---

## 6. 烹饪方式模块 `/api/v1/cooking-methods`

### 6.1 获取所有烹饪方式

```
GET /cooking-methods
```

### 6.2 新增烹饪方式

```
POST /cooking-methods
```

请求体:
```json
{
  "name": "string"
}
```

### 6.3 更新烹饪方式

```
PUT /cooking-methods/:id
```

### 6.4 删除烹饪方式

```
DELETE /cooking-methods/:id
```

---

## 7. 标签模块 `/api/v1/tags`

### 7.1 获取所有标签

```
GET /tags
```

### 7.2 新增标签

```
POST /tags
```

请求体:
```json
{
  "name": "string"
}
```

### 7.3 更新标签

```
PUT /tags/:id
```

### 7.4 删除标签

```
DELETE /tags/:id
```

---

## 8. 菜单模块 `/api/v1/menus`

### 8.1 获取菜单列表

```
GET /menus?status=published&mealType=dinner&page=1&pageSize=20
```

**需要认证**

查询参数:
- `status`: draft / published / selection_closed / cooking / completed
- `mealType`: breakfast / lunch / dinner / afternoon_tea / late_night
- `dateFrom`: ISO8601 日期
- `dateTo`: ISO8601 日期
- `createdByMe`: `true` 仅看自己创建的

### 8.2 获取单个菜单详情

```
GET /menus/:menuId
```

**需要认证**

响应 `200`:
```json
{
  "id": "string",
  "title": "string",
  "mealType": "dinner",
  "mealTime": "ISO8601",
  "deadline": "ISO8601",
  "status": "published",
  "createdBy": { "id": "string", "displayName": "string" },
  "creators": [
    { "userId": "string", "displayName": "string", "role": "owner" }
  ],
  "invitees": [
    {
      "userId": "string",
      "displayName": "string",
      "familyRole": "母亲",
      "hasSelected": true,
      "selectedAt": "ISO8601"
    }
  ],
  "dishes": [
    {
      "menuDishId": "string",
      "dishId": "string",
      "name": "string",
      "description": "string",
      "photoUrl": "string",
      "sortOrder": 0,
      "addedBy": { "id": "string", "displayName": "string" },
      "selections": [
        { "userId": "string", "displayName": "string", "familyRole": "string" }
      ],
      "selectionCount": 3
    }
  ],
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### 8.3 创建菜单

```
POST /menus
```

**需要认证**

请求体:
```json
{
  "title": "string (必填)",
  "mealType": "dinner (必填)",
  "mealTime": "ISO8601 (必填)",
  "deadline": "ISO8601 (必填)",
  "inviteeIds": ["userId1", "userId2"],
  "collaboratorIds": ["userId3"],
  "dishes": [
    {
      "dishId": "string",
      "photoUrl": "string|null",
      "sortOrder": 0
    }
  ]
}
```

### 8.4 更新菜单基本信息

```
PUT /menus/:menuId
```

**需要认证**（创建者或协作厨师）

请求体:
```json
{
  "title": "string",
  "mealType": "string",
  "mealTime": "ISO8601",
  "deadline": "ISO8601"
}
```

### 8.5 向菜单添加菜品

```
POST /menus/:menuId/dishes
```

**需要认证**（创建者或协作厨师）

请求体:
```json
{
  "dishId": "string (必填)",
  "photoUrl": "string|null",
  "sortOrder": 0
}
```

> 每添加一个菜品立即保存（自动保存机制）

### 8.6 从菜单移除菜品

```
DELETE /menus/:menuId/dishes/:menuDishId
```

**需要认证**（创建者或协作厨师）

### 8.7 更新菜单中菜品顺序

```
PUT /menus/:menuId/dishes/reorder
```

请求体:
```json
{
  "orderedDishIds": ["menuDishId1", "menuDishId2", "menuDishId3"]
}
```

### 8.8 更新邀请人员

```
PUT /menus/:menuId/invitees
```

请求体:
```json
{
  "inviteeIds": ["userId1", "userId2"]
}
```

### 8.9 更新协作厨师

```
PUT /menus/:menuId/collaborators
```

请求体:
```json
{
  "collaboratorIds": ["userId1"]
}
```

### 8.10 发布菜单（草稿 → 已发布）

```
POST /menus/:menuId/publish
```

**需要认证**（创建者）

> 发布后通知所有被邀请的家人

### 8.11 关闭选菜（手动提前关闭）

```
POST /menus/:menuId/close-selection
```

**需要认证**（创建者或协作厨师）

### 8.12 标记烹饪中

```
POST /menus/:menuId/start-cooking
```

**需要认证**（创建者或协作厨师）

### 8.13 标记已完成（饭做好了）

```
POST /menus/:menuId/complete
```

**需要认证**（创建者或协作厨师）

> 通知所有被邀请的家人"饭做好了"

### 8.14 删除菜单

```
DELETE /menus/:menuId
```

**需要认证**（创建者或管理员，仅草稿状态可删）

---

## 9. 选菜模块 `/api/v1/menus/:menuId/selections`

### 9.1 提交/更新我的选择

```
PUT /menus/:menuId/selections
```

**需要认证**（被邀请的家人）

请求体:
```json
{
  "menuDishIds": ["menuDishId1", "menuDishId2"]
}
```

> 覆盖式更新：传入当前选中的所有菜品ID

### 9.2 获取我的选择

```
GET /menus/:menuId/selections/me
```

**需要认证**

响应 `200`:
```json
{
  "menuDishIds": ["menuDishId1", "menuDishId2"],
  "selectedAt": "ISO8601"
}
```

### 9.3 获取选菜汇总

```
GET /menus/:menuId/selections/summary
```

**需要认证**

响应 `200`:
```json
{
  "dishes": [
    {
      "menuDishId": "string",
      "dishName": "string",
      "photoUrl": "string",
      "selectionCount": 3,
      "selectedBy": [
        { "userId": "string", "displayName": "string", "familyRole": "string" }
      ]
    }
  ],
  "totalInvitees": 5,
  "completedInvitees": 3
}
```

### 9.4 获取可打印的菜单

```
GET /menus/:menuId/print
```

**需要认证**（创建者或协作厨师）

响应 `200`:
```json
{
  "title": "string",
  "mealType": "dinner",
  "mealTime": "ISO8601",
  "dishes": [
    {
      "name": "string",
      "selectionCount": 3,
      "ingredients": ["牛肉", "土豆", "胡萝卜"],
      "cookingMethods": ["炖"]
    }
  ],
  "totalInvitees": 5
}
```

---

## 10. 通知模块 `/api/v1/notifications`

### 10.1 获取我的通知列表

```
GET /notifications?unreadOnly=true&page=1&pageSize=20
```

**需要认证**

### 10.2 标记通知已读

```
PUT /notifications/:notificationId/read
```

### 10.3 标记所有通知已读

```
PUT /notifications/read-all
```

### 10.4 获取未读数量

```
GET /notifications/unread-count
```

响应 `200`:
```json
{
  "count": 5
}
```

### 10.5 注册浏览器推送

```
POST /notifications/push-subscription
```

请求体:
```json
{
  "endpoint": "string",
  "keys": {
    "p256dh": "string",
    "auth": "string"
  }
}
```

### 10.6 取消浏览器推送

```
DELETE /notifications/push-subscription
```

---

## 11. 轮询接口

### 11.1 轮询新消息

```
GET /poll?since=ISO8601
```

**需要认证**

响应 `200`:
```json
{
  "notifications": [...],
  "unreadCount": 5,
  "serverTime": "ISO8601"
}
```

> 前端每 30 秒轮询一次，`since` 参数传上次轮询的 `serverTime`

---

## 12. 统计模块 `/api/v1/stats`（后续迭代）

### 12.1 菜品受欢迎排行

```
GET /stats/popular-dishes?limit=10&dateFrom=&dateTo=
```

### 12.2 个人偏好统计

```
GET /stats/user-preferences/:userId
```

---

## 错误码一览

| HTTP Status | Code | 说明 |
|-------------|------|------|
| 400 | INVALID_INPUT | 请求参数不合法 |
| 401 | UNAUTHORIZED | 未登录或 Token 过期 |
| 403 | FORBIDDEN | 无权限 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | DUPLICATE | 重复数据（如用户名已存在） |
| 410 | EXPIRED | 选菜已截止 |
| 422 | UNPROCESSABLE | 业务逻辑错误（如菜单状态不允许该操作） |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

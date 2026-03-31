/**
 * OpenAPI 3.0 specification for 吃饭 ChiFan API
 * Generated from actual route implementations
 */
export const spec = {
  openapi: '3.0.3',
  info: {
    title: '吃饭 ChiFan — 家庭点餐协调系统 API',
    version: '1.2.0',
    description: '家庭成员共同决定每顿饭吃什么的协作平台。支持菜品管理、菜单创建、选菜投票、过敏原检测、通知推送等功能。',
  },
  servers: [
    { url: '/api/v1', description: 'API v1' },
  ],
  tags: [
    { name: 'Health', description: '健康检查' },
    { name: 'Auth', description: '认证（登录/注册/登出）' },
    { name: 'Users', description: '用户管理' },
    { name: 'Dishes', description: '菜品管理' },
    { name: 'Ingredients', description: '食材管理' },
    { name: 'Ingredient Categories', description: '食材分类管理' },
    { name: 'Cooking Methods', description: '烹饪方式管理' },
    { name: 'Tags', description: '标签管理' },
    { name: 'Menus', description: '菜单全生命周期' },
    { name: 'Notifications', description: '通知管理' },
    { name: 'Poll', description: '长轮询' },
    { name: 'Uploads', description: '文件上传' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token, 7天有效期, HS256',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'INVALID_INPUT' },
              message: { type: 'string', example: '请填写所有必填字段' },
            },
            required: ['code', 'message'],
          },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          username: { type: 'string' },
          email: { type: 'string' },
          displayName: { type: 'string' },
          familyRole: { type: 'string', nullable: true },
          avatarUrl: { type: 'string', nullable: true },
          isAdmin: { type: 'boolean' },
          status: { type: 'string', enum: ['pending', 'active', 'rejected'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Dish: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          pinyin: { type: 'string', nullable: true },
          pinyinInitial: { type: 'string', nullable: true },
          createdBy: { type: 'integer' },
          defaultPhotoId: { type: 'integer', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          ingredients: { type: 'array', items: { type: 'object' } },
          cookingMethods: { type: 'array', items: { type: 'object' } },
          tags: { type: 'array', items: { type: 'object' } },
          photos: { type: 'array', items: { type: 'object' } },
        },
      },
      Menu: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'afternoon_tea', 'late_night'] },
          mealTime: { type: 'string', format: 'date-time' },
          deadline: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['draft', 'published', 'selection_closed', 'cooking', 'completed'] },
          createdBy: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          userId: { type: 'integer' },
          type: { type: 'string' },
          title: { type: 'string' },
          content: { type: 'string' },
          relatedMenuId: { type: 'integer', nullable: true },
          isRead: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    parameters: {
      PageParam: { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
      PageSizeParam: { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
    },
    responses: {
      Unauthorized: { description: '未认证', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      Forbidden: { description: '权限不足', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      NotFound: { description: '资源不存在', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      RateLimited: {
        description: '请求过于频繁',
        headers: {
          'Retry-After': { schema: { type: 'integer' }, description: '需等待的秒数' },
          'X-RateLimit-Limit': { schema: { type: 'integer' } },
          'X-RateLimit-Remaining': { schema: { type: 'integer' } },
          'X-RateLimit-Reset': { schema: { type: 'integer' } },
        },
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
  paths: {
    // ─── Health ───
    '/health': {
      get: {
        tags: ['Health'],
        summary: '健康检查',
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } } } },
      },
    },
    // ─── Auth ───
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: '注册新用户',
        description: '注册后需管理员审批才能登录',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'email', 'password', 'displayName'],
                properties: {
                  username: { type: 'string', maxLength: 30, pattern: '^[a-zA-Z0-9_]+$' },
                  email: { type: 'string', format: 'email', maxLength: 100 },
                  password: { type: 'string', minLength: 8 },
                  displayName: { type: 'string', maxLength: 50 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: '注册成功', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
          400: { description: '参数错误', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: '用户名或邮箱已存在', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: '登录',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['login', 'password'],
                properties: {
                  login: { type: 'string', description: '用户名或邮箱' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: '登录成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    expiresIn: { type: 'integer', example: 604800 },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: '登出',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: '已退出登录' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: '获取当前用户信息',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: '当前用户', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    // ─── Users ───
    '/users': {
      get: {
        tags: ['Users'],
        summary: '列出用户（管理员）',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'active', 'rejected'] } },
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/PageSizeParam' },
        ],
        responses: {
          200: { description: '用户列表' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Users'],
        summary: '创建用户（管理员）',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'email', 'password', 'displayName'],
                properties: {
                  username: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string' },
                  displayName: { type: 'string' },
                  familyRole: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 201: { description: '创建成功' }, 403: { $ref: '#/components/responses/Forbidden' } },
      },
    },
    '/users/family-members': {
      get: {
        tags: ['Users'],
        summary: '获取已批准的家庭成员',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: '家庭成员列表' } },
      },
    },
    '/users/me/preferences': {
      get: {
        tags: ['Users'],
        summary: '获取当前用户饮食偏好',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: '偏好信息（dietaryNotes + allergenIds）' } },
      },
      put: {
        tags: ['Users'],
        summary: '更新饮食偏好',
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  dietaryNotes: { type: 'string' },
                  allergenIds: { type: 'array', items: { type: 'integer' } },
                },
              },
            },
          },
        },
        responses: { 200: { description: '偏好已更新' } },
      },
    },
    '/users/preferences/all': {
      get: {
        tags: ['Users'],
        summary: '获取所有家庭成员偏好',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: '所有成员的偏好列表' } },
      },
    },
    '/users/me/password': {
      put: {
        tags: ['Users'],
        summary: '修改自己密码',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['oldPassword', 'newPassword'],
                properties: {
                  oldPassword: { type: 'string' },
                  newPassword: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: { 200: { description: '密码修改成功' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/users/{userId}': {
      put: {
        tags: ['Users'],
        summary: '更新用户信息（本人或管理员）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  displayName: { type: 'string' },
                  familyRole: { type: 'string' },
                  avatarUrl: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: '更新成功' }, 403: { $ref: '#/components/responses/Forbidden' } },
      },
    },
    '/users/{userId}/approve': {
      put: {
        tags: ['Users'],
        summary: '审批用户（管理员）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['action'],
                properties: { action: { type: 'string', enum: ['approve', 'reject'] } },
              },
            },
          },
        },
        responses: { 200: { description: '审批成功' }, 403: { $ref: '#/components/responses/Forbidden' } },
      },
    },
    '/users/{userId}/reset-password': {
      put: {
        tags: ['Users'],
        summary: '重置用户密码（管理员）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['newPassword'], properties: { newPassword: { type: 'string' } } },
            },
          },
        },
        responses: { 200: { description: '密码已重置' }, 403: { $ref: '#/components/responses/Forbidden' } },
      },
    },
    // ─── Dishes ───
    '/dishes': {
      get: {
        tags: ['Dishes'],
        summary: '菜品列表',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'keyword', in: 'query', schema: { type: 'string' } },
          { name: 'tagId', in: 'query', schema: { type: 'integer' } },
          { name: 'ingredientId', in: 'query', schema: { type: 'integer' } },
          { name: 'cookingMethodId', in: 'query', schema: { type: 'integer' } },
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/PageSizeParam' },
        ],
        responses: { 200: { description: '分页菜品列表' } },
      },
      post: {
        tags: ['Dishes'],
        summary: '创建菜品',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string', description: 'Markdown 格式' },
                  pinyin: { type: 'string' },
                  pinyinInitial: { type: 'string' },
                  ingredientIds: { type: 'array', items: { type: 'integer' } },
                  cookingMethodIds: { type: 'array', items: { type: 'integer' } },
                  tagIds: { type: 'array', items: { type: 'integer' } },
                },
              },
            },
          },
        },
        responses: { 201: { description: '创建成功', content: { 'application/json': { schema: { $ref: '#/components/schemas/Dish' } } } } },
      },
    },
    '/dishes/search': {
      get: {
        tags: ['Dishes'],
        summary: '搜索菜品（菜单创建用）',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', maximum: 30 } },
        ],
        responses: { 200: { description: '搜索结果' } },
      },
    },
    '/dishes/favorites': {
      get: {
        tags: ['Dishes'],
        summary: '获取当前用户收藏菜品',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 30 } }],
        responses: { 200: { description: '收藏菜品列表' } },
      },
    },
    '/dishes/favorites/all': {
      get: {
        tags: ['Dishes'],
        summary: '获取所有家庭成员收藏',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 5, maximum: 20 } }],
        responses: { 200: { description: '所有成员收藏' } },
      },
    },
    '/dishes/{dishId}': {
      get: {
        tags: ['Dishes'],
        summary: '菜品详情',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'dishId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: '菜品信息', content: { 'application/json': { schema: { $ref: '#/components/schemas/Dish' } } } },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Dishes'],
        summary: '更新菜品（创建者或管理员）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'dishId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  pinyin: { type: 'string' },
                  pinyinInitial: { type: 'string' },
                  ingredientIds: { type: 'array', items: { type: 'integer' } },
                  cookingMethodIds: { type: 'array', items: { type: 'integer' } },
                  tagIds: { type: 'array', items: { type: 'integer' } },
                  defaultPhotoId: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: { 200: { description: '更新成功' }, 403: { $ref: '#/components/responses/Forbidden' } },
      },
      delete: {
        tags: ['Dishes'],
        summary: '删除菜品（创建者或管理员）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'dishId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '已删除' }, 403: { $ref: '#/components/responses/Forbidden' } },
      },
    },
    '/dishes/{dishId}/clone': {
      post: {
        tags: ['Dishes'],
        summary: '克隆菜品',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'dishId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  pinyin: { type: 'string' },
                  pinyinInitial: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 201: { description: '克隆成功' } },
      },
    },
    '/dishes/{dishId}/photos': {
      post: {
        tags: ['Dishes'],
        summary: '上传菜品照片（创建者或管理员）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'dishId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } },
        },
        responses: { 201: { description: '上传成功' }, 403: { $ref: '#/components/responses/Forbidden' } },
      },
    },
    '/dishes/{dishId}/default-photo': {
      put: {
        tags: ['Dishes'],
        summary: '设置默认照片（创建者或管理员）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'dishId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['photoId'], properties: { photoId: { type: 'integer' } } } } },
        },
        responses: { 200: { description: '已设置' } },
      },
    },
    '/dishes/{dishId}/photos/{photoId}': {
      delete: {
        tags: ['Dishes'],
        summary: '删除照片（创建者或管理员）',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'dishId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'photoId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: { 200: { description: '已删除' } },
      },
    },
    // ─── Ingredients ───
    '/ingredients': {
      get: {
        tags: ['Ingredients'],
        summary: '搜索食材',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'keyword', in: 'query', schema: { type: 'string' } },
          { name: 'categoryId', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: '食材列表' } },
      },
      post: {
        tags: ['Ingredients'],
        summary: '创建食材（管理员）',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, categoryId: { type: 'integer' } } } } },
        },
        responses: { 201: { description: '创建成功' }, 403: { $ref: '#/components/responses/Forbidden' } },
      },
    },
    '/ingredients/grouped': {
      get: {
        tags: ['Ingredients'],
        summary: '按分类分组获取食材',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: '分组食材' } },
      },
    },
    '/ingredients/{id}': {
      put: {
        tags: ['Ingredients'],
        summary: '更新食材（管理员）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, categoryId: { type: 'integer' } } } } } },
        responses: { 200: { description: '更新成功' } },
      },
      delete: {
        tags: ['Ingredients'],
        summary: '删除食材（管理员）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '已删除' } },
      },
    },
    // ─── Ingredient Categories ───
    '/ingredient-categories': {
      get: {
        tags: ['Ingredient Categories'],
        summary: '列出食材分类',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: '分类列表' } },
      },
      post: {
        tags: ['Ingredient Categories'],
        summary: '创建分类（管理员）',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, sortOrder: { type: 'integer' } } } } },
        },
        responses: { 201: { description: '创建成功' } },
      },
    },
    '/ingredient-categories/{id}': {
      put: {
        tags: ['Ingredient Categories'],
        summary: '更新分类（管理员）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '更新成功' } },
      },
      delete: {
        tags: ['Ingredient Categories'],
        summary: '删除分类（管理员）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '已删除' } },
      },
    },
    // ─── Cooking Methods ───
    '/cooking-methods': {
      get: {
        tags: ['Cooking Methods'],
        summary: '列出烹饪方式',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: '烹饪方式列表' } },
      },
      post: {
        tags: ['Cooking Methods'],
        summary: '创建烹饪方式（管理员）',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } } } },
        responses: { 201: { description: '创建成功' } },
      },
    },
    '/cooking-methods/{id}': {
      put: {
        tags: ['Cooking Methods'],
        summary: '更新烹饪方式（管理员）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '更新成功' } },
      },
      delete: {
        tags: ['Cooking Methods'],
        summary: '删除烹饪方式（管理员）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '已删除' } },
      },
    },
    // ─── Tags ───
    '/tags': {
      get: {
        tags: ['Tags'],
        summary: '列出标签',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: '标签列表' } },
      },
      post: {
        tags: ['Tags'],
        summary: '创建标签（管理员）',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } } } },
        responses: { 201: { description: '创建成功' } },
      },
    },
    '/tags/{id}': {
      put: {
        tags: ['Tags'],
        summary: '更新标签（管理员）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '更新成功' } },
      },
      delete: {
        tags: ['Tags'],
        summary: '删除标签（管理员）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '已删除' } },
      },
    },
    // ─── Menus ───
    '/menus': {
      get: {
        tags: ['Menus'],
        summary: '菜单列表',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'published', 'selection_closed', 'cooking', 'completed'] } },
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/PageSizeParam' },
        ],
        responses: { 200: { description: '分页菜单列表' } },
      },
      post: {
        tags: ['Menus'],
        summary: '创建菜单',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'mealType', 'mealTime', 'deadline', 'inviteeIds'],
                properties: {
                  title: { type: 'string' },
                  mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'afternoon_tea', 'late_night'] },
                  mealTime: { type: 'string', format: 'date-time' },
                  deadline: { type: 'string', format: 'date-time' },
                  inviteeIds: { type: 'array', items: { type: 'integer' } },
                  collaboratorIds: { type: 'array', items: { type: 'integer' } },
                  dishes: { type: 'array', items: { type: 'object', properties: { dishId: { type: 'integer' }, sortOrder: { type: 'integer' } } } },
                },
              },
            },
          },
        },
        responses: { 201: { description: '创建成功', content: { 'application/json': { schema: { $ref: '#/components/schemas/Menu' } } } } },
      },
    },
    '/menus/{menuId}': {
      get: {
        tags: ['Menus'],
        summary: '菜单详情（参与者）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'menuId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '菜单信息' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
      put: {
        tags: ['Menus'],
        summary: '更新菜单（创建者）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'menuId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  mealType: { type: 'string' },
                  mealTime: { type: 'string', format: 'date-time' },
                  deadline: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: { 200: { description: '更新成功' } },
      },
      delete: {
        tags: ['Menus'],
        summary: '删除菜单（创建者）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'menuId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 204: { description: '已删除' } },
      },
    },
    '/menus/{menuId}/dishes': {
      post: {
        tags: ['Menus'],
        summary: '添加菜品到菜单（创建者）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'menuId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['dishId'], properties: { dishId: { type: 'integer' }, photoUrl: { type: 'string' }, sortOrder: { type: 'integer' } } } } },
        },
        responses: { 201: { description: '添加成功' } },
      },
    },
    '/menus/{menuId}/dishes/{menuDishId}': {
      delete: {
        tags: ['Menus'],
        summary: '移除菜品（创建者）',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'menuId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'menuDishId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: { 204: { description: '已移除' } },
      },
    },
    '/menus/{menuId}/dishes/reorder': {
      put: {
        tags: ['Menus'],
        summary: '重排菜品顺序（创建者）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'menuId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  order: { type: 'array', items: { type: 'object', properties: { menuDishId: { type: 'integer' }, sortOrder: { type: 'integer' } } } },
                },
              },
            },
          },
        },
        responses: { 200: { description: '重排成功' } },
      },
    },
    '/menus/{menuId}/invitees': {
      put: {
        tags: ['Menus'],
        summary: '更新受邀人（创建者）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'menuId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { inviteeIds: { type: 'array', items: { type: 'integer' } } } } } } },
        responses: { 200: { description: '更新成功' } },
      },
    },
    '/menus/{menuId}/collaborators': {
      put: {
        tags: ['Menus'],
        summary: '更新协作者（创建者）',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'menuId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { collaboratorIds: { type: 'array', items: { type: 'integer' } } } } } } },
        responses: { 200: { description: '更新成功' } },
      },
    },
    '/menus/{menuId}/publish': {
      post: { tags: ['Menus'], summary: '发布菜单', security: [{ BearerAuth: [] }], parameters: [{ name: 'menuId', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: '已发布' } } },
    },
    '/menus/{menuId}/close-selection': {
      post: { tags: ['Menus'], summary: '结束选菜', security: [{ BearerAuth: [] }], parameters: [{ name: 'menuId', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: '选菜已结束' } } },
    },
    '/menus/{menuId}/start-cooking': {
      post: { tags: ['Menus'], summary: '开始做饭', security: [{ BearerAuth: [] }], parameters: [{ name: 'menuId', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: '开始做饭' } } },
    },
    '/menus/{menuId}/complete': {
      post: { tags: ['Menus'], summary: '完成菜单', security: [{ BearerAuth: [] }], parameters: [{ name: 'menuId', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: '菜单已完成' } } },
    },
    '/menus/{menuId}/selections/me': {
      get: { tags: ['Menus'], summary: '获取个人选菜', security: [{ BearerAuth: [] }], parameters: [{ name: 'menuId', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: '已选菜品列表' } } },
    },
    '/menus/{menuId}/selections': {
      put: {
        tags: ['Menus'],
        summary: '提交/更新选菜',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'menuId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { menuDishIds: { type: 'array', items: { type: 'integer' } } } } } } },
        responses: { 200: { description: '选菜已更新' } },
      },
    },
    '/menus/{menuId}/selections/summary': {
      get: { tags: ['Menus'], summary: '选菜汇总', security: [{ BearerAuth: [] }], parameters: [{ name: 'menuId', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: '选菜汇总信息' } } },
    },
    '/menus/{menuId}/print': {
      get: { tags: ['Menus'], summary: '打印数据', security: [{ BearerAuth: [] }], parameters: [{ name: 'menuId', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: '打印友好格式' } } },
    },
    '/menus/{menuId}/allergen-warnings': {
      get: { tags: ['Menus'], summary: '过敏原冲突警告', security: [{ BearerAuth: [] }], parameters: [{ name: 'menuId', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: '过敏原警告列表' } } },
    },
    // ─── Notifications ───
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: '通知列表',
        security: [{ BearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/PageSizeParam' }],
        responses: { 200: { description: '分页通知列表' } },
      },
    },
    '/notifications/unread-count': {
      get: { tags: ['Notifications'], summary: '未读通知计数', security: [{ BearerAuth: [] }], responses: { 200: { description: '未读数', content: { 'application/json': { schema: { type: 'object', properties: { count: { type: 'integer' } } } } } } } },
    },
    '/notifications/read-all': {
      put: { tags: ['Notifications'], summary: '全部标为已读', security: [{ BearerAuth: [] }], responses: { 200: { description: '标记成功' } } },
    },
    '/notifications/{notificationId}/read': {
      put: {
        tags: ['Notifications'],
        summary: '单条标为已读',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'notificationId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '标记成功' } },
      },
    },
    // ─── Poll ───
    '/poll': {
      get: {
        tags: ['Poll'],
        summary: '长轮询新通知',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'since', in: 'query', schema: { type: 'string', format: 'date-time' }, description: '上次轮询时间戳' }],
        responses: {
          200: {
            description: '轮询结果',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    notifications: { type: 'array', items: { $ref: '#/components/schemas/Notification' } },
                    unreadCount: { type: 'integer' },
                    serverTime: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    // ─── Uploads ───
    '/uploads/image': {
      post: {
        tags: ['Uploads'],
        summary: '上传图片',
        description: '最大 5MB，仅限 JPG/PNG/WebP，Magic bytes 校验',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } },
        },
        responses: {
          201: { description: '上传成功', content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string', example: '/api/v1/photos/uploads/{imageId}' } } } } } },
          400: { description: '文件格式或大小不合法' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
  },
} as const;

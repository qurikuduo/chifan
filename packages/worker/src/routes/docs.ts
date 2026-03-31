import { Hono } from 'hono';
import type { Env } from '../env.js';
import { spec } from './openapi-spec.js';

export const docsRoutes = new Hono<{ Bindings: Env }>();

// Serve the raw OpenAPI JSON spec
docsRoutes.get('/openapi.json', (c) => {
  return c.json(spec);
});

// Serve Swagger UI
docsRoutes.get('/', (c) => {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>吃饭 ChiFan API</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/v1/docs/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
    });
  </script>
</body>
</html>`;
  return c.html(html);
});

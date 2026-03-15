export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const workerUrl = `https://family-menu-api.sixiweb.workers.dev${url.pathname}${url.search}`;
  
  const headers = new Headers(context.request.headers);
  headers.set('Host', 'family-menu-api.sixiweb.workers.dev');
  
  const response = await fetch(workerUrl, {
    method: context.request.method,
    headers,
    body: context.request.method !== 'GET' && context.request.method !== 'HEAD' 
      ? context.request.body 
      : undefined,
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};

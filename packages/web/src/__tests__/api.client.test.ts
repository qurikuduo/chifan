import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiRequestError } from '@/api/client';

describe('ApiClient', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    localStorage.clear();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function jsonResponse(data: unknown, status = 200) {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
    });
  }

  describe('request method', () => {
    it('should send GET request to correct URL', async () => {
      mockFetch.mockReturnValue(jsonResponse({ id: 1 }));
      await api.get('/test');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/test',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('should include Authorization header when token exists', async () => {
      localStorage.setItem('token', 'my-jwt-token');
      mockFetch.mockReturnValue(jsonResponse({}));
      await api.get('/secure');
      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.headers['Authorization']).toBe('Bearer my-jwt-token');
    });

    it('should not include Authorization when no token', async () => {
      mockFetch.mockReturnValue(jsonResponse({}));
      await api.get('/public');
      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.headers['Authorization']).toBeUndefined();
    });

    it('should send JSON body for POST requests', async () => {
      mockFetch.mockReturnValue(jsonResponse({}, 201));
      await api.post('/items', { name: 'test' });
      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.method).toBe('POST');
      expect(opts.body).toBe(JSON.stringify({ name: 'test' }));
      expect(opts.headers['Content-Type']).toBe('application/json');
    });

    it('should send PUT request with body', async () => {
      mockFetch.mockReturnValue(jsonResponse({}));
      await api.put('/items/1', { name: 'updated' });
      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.method).toBe('PUT');
      expect(opts.body).toBe(JSON.stringify({ name: 'updated' }));
    });

    it('should send DELETE request', async () => {
      mockFetch.mockReturnValue(jsonResponse({}));
      await api.delete('/items/1');
      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.method).toBe('DELETE');
    });

    it('should return undefined for 204 responses', async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve() }),
      );
      const result = await api.delete('/items/1');
      expect(result).toBeUndefined();
    });

    it('should parse JSON response', async () => {
      mockFetch.mockReturnValue(jsonResponse({ data: [1, 2, 3] }));
      const result = await api.get('/items');
      expect(result).toEqual({ data: [1, 2, 3] });
    });
  });

  describe('error handling', () => {
    it('should throw ApiRequestError on non-ok response', async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: { code: 'INVALID_INPUT', message: '参数错误' } }),
        }),
      );
      await expect(api.get('/bad')).rejects.toThrow(ApiRequestError);
    });

    it('should include error code and status in ApiRequestError', async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: { code: 'NOT_FOUND', message: '不存在' } }),
        }),
      );
      try {
        await api.get('/missing');
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiRequestError);
        const err = e as ApiRequestError;
        expect(err.code).toBe('NOT_FOUND');
        expect(err.status).toBe(404);
        expect(err.message).toBe('不存在');
      }
    });

    it('should clear token and redirect on 401', async () => {
      localStorage.setItem('token', 'old-token');
      localStorage.setItem('user', '{}');
      // Mock window.location
      const locationMock = { href: '' };
      vi.stubGlobal('location', locationMock);

      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: { code: 'UNAUTHORIZED', message: '未认证' } }),
        }),
      );

      await expect(api.get('/secure')).rejects.toThrow();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(locationMock.href).toBe('/login');
    });

    it('should not redirect on non-401 errors', async () => {
      localStorage.setItem('token', 'my-token');
      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 403,
          json: () => Promise.resolve({ error: { code: 'FORBIDDEN', message: '禁止' } }),
        }),
      );
      await expect(api.get('/forbidden')).rejects.toThrow();
      expect(localStorage.getItem('token')).toBe('my-token');
    });
  });

  describe('upload method', () => {
    it('should send FormData without Content-Type header', async () => {
      localStorage.setItem('token', 'upload-token');
      mockFetch.mockReturnValue(jsonResponse({ url: '/photo.jpg' }, 201));
      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.jpg');

      await api.upload('/uploads/image', formData);

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/v1/uploads/image');
      expect(opts.method).toBe('POST');
      expect(opts.body).toBe(formData);
      expect(opts.headers['Authorization']).toBe('Bearer upload-token');
      // Should NOT have Content-Type (browser sets it with boundary)
      expect(opts.headers['Content-Type']).toBeUndefined();
    });

    it('should throw ApiRequestError on upload failure', async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 413,
          json: () => Promise.resolve({ error: { code: 'FILE_TOO_LARGE', message: '文件过大' } }),
        }),
      );
      const formData = new FormData();
      await expect(api.upload('/uploads/image', formData)).rejects.toThrow(ApiRequestError);
    });
  });
});

describe('ApiRequestError', () => {
  it('should set name to ApiRequestError', () => {
    const err = new ApiRequestError('TEST', 'test message', 500);
    expect(err.name).toBe('ApiRequestError');
    expect(err.code).toBe('TEST');
    expect(err.message).toBe('test message');
    expect(err.status).toBe(500);
  });

  it('should be an instance of Error', () => {
    const err = new ApiRequestError('ERR', 'msg', 400);
    expect(err).toBeInstanceOf(Error);
  });
});

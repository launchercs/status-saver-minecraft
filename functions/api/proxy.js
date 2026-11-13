export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // آدرس API اصلی شما روی Render
  const RENDER_BASE = 'https://minecraft-dr4w.onrender.com';
  
  // ساخت آدرس مقصد (همه درخواست‌های /api/proxy به /api/status روی Render می‌رن)
  const targetUrl = new URL(RENDER_BASE + '/api/status');
  targetUrl.search = url.search; // انتقال پارامترها مثل host و edition

  // کپی کردن هدرها و اضافه کردن کلید API در صورت نیاز
  const headers = new Headers(request.headers);
  if (env.MC_API_KEY) {
    headers.set('X-API-Key', env.MC_API_KEY);
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: headers,
    });

    // ساخت پاسخ جدید و اضافه کردن هدرهای CORS
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return newResponse;
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Proxy request failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
      }
    });
  }
}

// مدیریت درخواست‌های پیش‌پرواز (OPTIONS) برای CORS
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  });
}

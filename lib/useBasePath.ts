import { useLocation } from 'react-router-dom';

/**
 * 根據當前路由判斷在 /admin 或 /consultant 下，回傳對應前綴。
 * 用於讓 AdminBookings、AdminQuoteList、QuoteBuilder 等頁面
 * 能同時服務兩種身分，連結 / 跳轉到對的後台。
 */
export function useBasePath(): '/admin' | '/consultant' {
  const { pathname } = useLocation();
  return pathname.startsWith('/consultant') ? '/consultant' : '/admin';
}

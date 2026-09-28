/**
 * useDebounce.js
 * Custom hook trì hoãn cập nhật giá trị theo delay (ms).
 *
 * Dùng chung toàn project — KHÔNG tạo bản sao trong từng feature.
 *
 * @param {*}      value - Giá trị cần debounce (bất kỳ type nào).
 * @param {number} [delay=300] - Thời gian trì hoãn tính bằng milliseconds.
 * @returns {*} Giá trị đã được debounce — chỉ cập nhật sau khi
 *              value không đổi trong `delay` ms liên tiếp.
 *
 * @example
 * import useDebounce from '../hooks/useDebounce';
 *
 * const [query, setQuery] = useState('');
 * const debouncedQuery = useDebounce(query, 300);
 *
 * useEffect(() => {
 *   // Chỉ gọi API sau khi người dùng ngừng gõ 300ms
 *   void searchAPI(debouncedQuery);
 * }, [debouncedQuery]);
 */

import { useState, useEffect } from 'react';

function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Đặt timer — chỉ cập nhật debouncedValue sau `delay` ms
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: huỷ timer cũ mỗi khi value hoặc delay thay đổi
    // (hoặc khi component unmount) — tránh stale state
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;

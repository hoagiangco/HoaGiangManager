'use client';

import { useEffect } from 'react';

/**
 * Hook to warn users before leaving a page if there are unsaved changes
 * @param isDirty boolean indicating whether form/data has unsaved modifications
 * @param message custom confirmation message
 */
export function useUnsavedChangesWarning(
  isDirty: boolean,
  message: string = 'Bạn có các thay đổi chưa được lưu. Bạn có chắc chắn muốn rời khỏi trang này?'
) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, message]);
}

export default useUnsavedChangesWarning;

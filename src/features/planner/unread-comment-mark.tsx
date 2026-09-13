import { cn } from "@/lib/utils";

import styles from "./unread-comment-mark.module.css";

export function UnreadCommentMark({ className }: { className?: string }) {
  return (
    <span className={cn(styles.mark, className)} title="New comment" aria-hidden>
      <svg viewBox="0 0 16 16" width="9" height="9" fill="currentColor">
        <path d="M3.4 2h9.2C14 2 15 3 15 4.4v5.2c0 1.4-1 2.4-2.4 2.4H8.1L4.2 14.7c-.4.3-.9 0-.9-.5v-2.2h-.9C1.6 12 1 11.1 1 9.6V4.4C1 3 2 2 3.4 2Z" />
      </svg>
    </span>
  );
}

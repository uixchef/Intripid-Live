"use client";

import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlay";

import styles from "./confirm-delete.module.css";

const SKIP_KEY = "intripid.planner.skip-delete-confirm";

export function shouldSkipDeleteConfirm(): boolean {
  try {
    return window.localStorage.getItem(SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberSkipDeleteConfirm() {
  try {
    window.localStorage.setItem(SKIP_KEY, "1");
  } catch {
    /* private mode — the next delete will ask again */
  }
}

export type ConfirmKind =
  | "activity"
  | "remove-traveller"
  | "leave"
  | "reset"
  | "cancel-trip"
  | "remove-connection"
  | "cancel-request"
  | "decline-request"
  | "delete-address"
  | "remove-photo";

export function confirmCopy(
  kind: ConfirmKind,
  subject: string,
): {
  heading: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  allowSkip: boolean;
} {
  switch (kind) {
    case "activity":
      return {
        heading: "Delete this stop?",
        body: `“${subject}” will be removed from the plan. This cannot be undone.`,
        confirmLabel: "Delete",
        cancelLabel: "Keep it",
        allowSkip: true,
      };
    case "remove-traveller":
      return {
        heading: "Remove this person?",
        body: `${subject} will leave the trip. Their assigned stops stay on the plan.`,
        confirmLabel: "Remove",
        cancelLabel: "Keep them",
        allowSkip: false,
      };
    case "leave":
      return {
        heading: "Leave this trip?",
        body: "You will be removed from the travellers list. The plan itself stays.",
        confirmLabel: "Leave",
        cancelLabel: "Stay",
        allowSkip: false,
      };
    case "reset":
      return {
        heading: "Reset this trip?",
        body: "This restores the original plan for this trip and discards your edits.",
        confirmLabel: "Reset",
        cancelLabel: "Keep my plan",
        allowSkip: false,
      };
    case "cancel-trip":
      return {
        heading: "Cancel this trip?",
        body: "You will leave the planner and return home. This demo does not delete a server record.",
        confirmLabel: "Cancel trip",
        cancelLabel: "Keep trip",
        allowSkip: false,
      };
    case "remove-connection":
      return {
        heading: "Remove this connection?",
        body: `${subject} will be removed from Connections. Trips they are already on stay unchanged.`,
        confirmLabel: "Remove",
        cancelLabel: "Keep them",
        allowSkip: false,
      };
    case "cancel-request":
      return {
        heading: "Cancel this request?",
        body: `${subject} will no longer see your request.`,
        confirmLabel: "Cancel request",
        cancelLabel: "Keep it",
        allowSkip: false,
      };
    case "decline-request":
      return {
        heading: "Decline this request?",
        body: `${subject} will not be added to your connects.`,
        confirmLabel: "Decline",
        cancelLabel: "Keep it",
        allowSkip: false,
      };
    case "delete-address":
      return {
        heading: "Delete this address?",
        body: `“${subject}” will be removed from your saved addresses.`,
        confirmLabel: "Delete",
        cancelLabel: "Keep it",
        allowSkip: false,
      };
    case "remove-photo":
      return {
        heading: "Remove this photo?",
        body: "Your profile will fall back to initials until you add another photo.",
        confirmLabel: "Remove",
        cancelLabel: "Keep it",
        allowSkip: false,
      };
  }
}

export function ConfirmDeleteModal({
  open,
  kind,
  subject,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  kind: ConfirmKind;
  subject: string;
  onCancel: () => void;
  onConfirm: (skipNext: boolean) => void;
}) {
  const skipId = useId();
  const [skipNext, setSkipNext] = useState(false);
  const copy = confirmCopy(kind, subject);

  useEffect(() => {
    if (open) setSkipNext(false);
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onCancel}
      label={copy.heading}
      width={400}
      className={styles.dialog}
    >
      <div className={styles.root}>
        <div className={styles.copy}>
          <h2 className={styles.heading}>{copy.heading}</h2>
          <p className={styles.body}>{copy.body}</p>
          {copy.allowSkip ? (
            <label className={styles.skip} htmlFor={skipId}>
              <input
                id={skipId}
                type="checkbox"
                checked={skipNext}
                onChange={(event) => setSkipNext(event.target.checked)}
              />
              Don't ask me to confirm every time
            </label>
          ) : null}
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" onClick={onCancel}>
            {copy.cancelLabel}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm(skipNext);
              setSkipNext(false);
            }}
          >
            {copy.confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function HoursExpandModal({
  open,
  currentFrom,
  currentTo,
  nextFrom,
  nextTo,
  stopFrom,
  stopTo,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  currentFrom: string;
  currentTo: string;
  nextFrom: string;
  nextTo: string;
  stopFrom: string;
  stopTo: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      label="Outside active hours"
      width={400}
      className={styles.dialog}
    >
      <div className={styles.root}>
        <div className={styles.copy}>
          <h2 className={styles.heading}>This is outside your active hours</h2>
          <p className={styles.body}>
            You&rsquo;re adding this activity in non-active hours ({stopFrom}–
            {stopTo}). Active hours are {currentFrom}–{currentTo}. Saving will
            update them to {nextFrom}–{nextTo}.
          </p>
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" onClick={onCancel}>
            Back
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Save and update hours
          </Button>
        </div>
      </div>
    </Modal>
  );
}

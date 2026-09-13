"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/overlay";
import { isPartyMember } from "@/lib/collaboration";
import { cn } from "@/lib/utils";
import type { Traveller } from "@/lib/types";

import styles from "./confirm-delete.module.css";

export type CancelTripIntent = "cancel" | "leave";

export function CancelTripModal({
  open,
  travellers,
  ownerId,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  travellers: Traveller[];
  ownerId: string | null;
  onCancel: () => void;
  onConfirm: (intent: CancelTripIntent, successorId?: string) => void;
}) {
  const successors = travellers.filter(
    (person) => person.id !== ownerId && isPartyMember(person),
  );
  const [intent, setIntent] = useState<CancelTripIntent>("cancel");
  const [successorId, setSuccessorId] = useState(successors[0]?.id ?? "");

  useEffect(() => {
    if (!open) return;
    setIntent("cancel");
    setSuccessorId(successors[0]?.id ?? "");
  }, [open, successors[0]?.id]);

  const leaveReady = intent === "leave" && Boolean(successorId);
  const confirmDisabled = intent === "leave" && !leaveReady;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      label="Cancel this trip?"
      width={480}
      className={styles.dialog}
    >
      <div className={styles.root}>
        <div className={styles.copy}>
          <h2 className={styles.heading}>Cancel this trip?</h2>
          <p className={styles.body}>
            Are you sure you want to delete your trip? If you&rsquo;re having
            problems, please contact{" "}
            <a className={styles.helpLink} href="mailto:help@intripid.co">
              help@intripid.co
            </a>{" "}
            who can help.
          </p>
          <p className={styles.body}>
            Once your trip has been canceled, it cannot be undone. That includes
            all conversations, planning, notes, and everything you&rsquo;ve done
            since starting this trip.
          </p>
        </div>

        <div
          className={styles.choices}
          role="radiogroup"
          aria-label="What should happen to this trip"
        >
          <label className={cn(styles.choice, intent === "cancel" && styles.choiceOn)}>
            <input
              type="radio"
              name="cancel-trip-intent"
              checked={intent === "cancel"}
              onChange={() => setIntent("cancel")}
            />
            <span>
              <span className={styles.choiceTitle}>Cancel the trip entirely</span>
              <span className={styles.choiceHint}>
                The plan is deleted for everyone on it.
              </span>
            </span>
          </label>

          <label
            className={cn(
              styles.choice,
              intent === "leave" && styles.choiceOn,
              successors.length === 0 && styles.choiceDisabled,
            )}
          >
            <input
              type="radio"
              name="cancel-trip-intent"
              checked={intent === "leave"}
              disabled={successors.length === 0}
              onChange={() => setIntent("leave")}
            />
            <span>
              <span className={styles.choiceTitle}>
                Leave and designate a new organiser
              </span>
              <span className={styles.choiceHint}>
                {successors.length === 0
                  ? "Invite someone who can take over before you leave."
                  : "The trip stays. You leave after handing it over."}
              </span>
            </span>
          </label>
        </div>

        {intent === "leave" && successors.length > 0 ? (
          <Select
            className={styles.successor}
            label="New organiser"
            fieldLabel="New organiser"
            value={successorId}
            onChange={setSuccessorId}
            options={successors.map((person) => ({
              value: person.id,
              label: person.name,
            }))}
          />
        ) : null}

        <div className={styles.actions}>
          <Button variant="ghost" onClick={onCancel}>
            Keep trip
          </Button>
          <Button
            variant="danger"
            disabled={confirmDisabled}
            onClick={() =>
              onConfirm(intent, intent === "leave" ? successorId : undefined)
            }
          >
            {intent === "leave" ? "Leave trip" : "Cancel trip"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

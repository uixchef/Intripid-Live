"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Search } from "lucide-react";

import { IconButton } from "@/components/ui/button";
import { Input, Segmented } from "@/components/ui/controls";
import { Modal, Popover } from "@/components/ui/overlay";
import { OutlineField } from "@/components/ui/outline-field";
import { Select } from "@/components/ui/select";
import { isConfirmedConnection, isPendingRequest } from "@/lib/collaboration";
import { cn } from "@/lib/utils";
import type { Connection, HouseholdRelation } from "@/lib/types";
import { initialsFromName, normaliseHandle, useSessionApi } from "@/stores/session-store";

import { ConfirmDeleteModal, type ConfirmKind } from "../planner/confirm-delete";
import planner from "../planner/planner-settings.module.css";
import styles from "./people-connections.module.css";

const RELATIONS: { value: HouseholdRelation; label: string }[] = [
  { value: "partner", label: "Partner" },
  { value: "family", label: "Family" },
  { value: "friend", label: "Friend" },
  { value: "colleague", label: "Colleague" },
];

export function PeopleConnections({
  connections,
  onChange,
  adding,
  onAddingChange,
}: {
  connections: Connection[];
  onChange: (next: Connection[]) => void;
  adding: boolean;
  onAddingChange: (open: boolean) => void;
}) {
  const session = useSessionApi();
  const [peopleList, setPeopleList] = useState<"connects" | "requests">(
    "connects",
  );
  const [requestFilter, setRequestFilter] = useState<"all" | "sent" | "received">(
    "all",
  );
  const [peopleQuery, setPeopleQuery] = useState("");
  const [personName, setPersonName] = useState("");
  const [personEmail, setPersonEmail] = useState("");
  const [personRelation, setPersonRelation] =
    useState<HouseholdRelation>("friend");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [lastInviteId, setLastInviteId] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    kind: Extract<ConfirmKind, "remove-connection" | "cancel-request" | "decline-request">;
    id: string;
    subject: string;
  } | null>(null);
  const addRef = useRef<HTMLDivElement>(null);

  const connectedPeople = connections.filter(isConfirmedConnection);
  const sentPeople = connections.filter((person) => person.invite === "sent");
  const receivedPeople = connections.filter(
    (person) => person.invite === "received",
  );
  const requestPeople = [...receivedPeople, ...sentPeople];
  const requestPool =
    requestFilter === "sent"
      ? sentPeople
      : requestFilter === "received"
        ? receivedPeople
        : requestPeople;
  const peoplePool = peopleList === "requests" ? requestPool : connectedPeople;
  const peopleVisible = peoplePool.filter((person) => {
    const query = peopleQuery.trim().toLowerCase().replace(/^@/, "");
    if (!query) return true;
    return (
      person.name.toLowerCase().includes(query) ||
      handleFor(person).includes(query)
    );
  });
  const profilePerson =
    connections.find((person) => person.id === profileId) ?? null;

  useEffect(() => {
    if (adding) {
      if (peopleList === "requests") setRequestFilter("sent");
      requestAnimationFrame(() => addRef.current?.scrollIntoView({ block: "nearest" }));
      return;
    }
    setPersonName("");
    setPersonEmail("");
  }, [adding, peopleList]);

  function addPerson() {
    const name = personName.trim();
    const email = personEmail.trim().toLowerCase();
    if (!name || !isEmail(email)) return;
    if (
      connections.some(
        (person) =>
          person.name.trim().toLowerCase() === name.toLowerCase() ||
          person.email?.toLowerCase() === email,
      )
    ) {
      setPersonName("");
      setPersonEmail("");
      return;
    }
    const sending = peopleList === "requests";
    const handle = uniqueHandle(name, connections);
    const id = `c-${handle || "person"}-${connections.length}`;
    onChange([
      ...connections,
      {
        id,
        name,
        handle,
        initials: initialsFromName(name),
        colorIndex: connections.length % 6,
        history: [],
        onCurrentTrip: false,
        relation: personRelation,
        invite: sending ? "sent" : "connected",
        email,
      },
    ]);
    setPersonName("");
    setPersonEmail("");
    onAddingChange(false);
    if (sending) {
      setLastInviteId(id);
      setRequestFilter("sent");
    }
  }

  function copyInviteLink(id: string) {
    void navigator.clipboard.writeText(inviteLinkFor(id)).then(
      () => session.getState().showToast("Invite link copied", "success"),
      () => session.getState().showToast("Couldn’t copy the invite link", "warning"),
    );
  }

  function removeConnection(id: string) {
    onChange(connections.filter((item) => item.id !== id));
    if (profileId === id) setProfileId(null);
    if (lastInviteId === id) setLastInviteId(null);
  }

  function askRemovePerson(person: Connection) {
    setPendingConfirm({
      kind:
        person.invite === "sent"
          ? "cancel-request"
          : person.invite === "received"
            ? "decline-request"
            : "remove-connection",
      id: person.id,
      subject: person.name,
    });
  }

  return (
    <div className={styles.body}>
      <div className={styles.tools}>
        <Segmented
          size="md"
          label="Friends and family lists"
          value={peopleList}
          onChange={setPeopleList}
          options={[
            {
              value: "connects",
              label: "Connects",
              count: connectedPeople.length,
            },
            {
              value: "requests",
              label: "Requests",
              count: requestPeople.length,
            },
          ]}
        />
        {peopleList === "requests" ? (
          <div className={styles.tabs} role="tablist" aria-label="Request type">
            {(
              [
                ["all", "All", requestPeople.length],
                ["sent", "Sent", sentPeople.length],
                ["received", "Received", receivedPeople.length],
              ] as const
            ).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={requestFilter === value}
                className={cn(styles.tab, requestFilter === value && styles.tabOn)}
                onClick={() => setRequestFilter(value)}
              >
                {label}
                <span className={cn(styles.tabCount, "tabular")}>{count}</span>
              </button>
            ))}
          </div>
        ) : null}
        <Input
          size="sm"
          className={styles.search}
          iconLeft={<Search size={14} strokeWidth={2.1} />}
          placeholder="Search by name or username"
          aria-label="Search people"
          value={peopleQuery}
          onChange={(event) => setPeopleQuery(event.target.value)}
        />
      </div>

      {peopleVisible.length > 0 ? (
        <ul className={styles.people}>
          {peopleVisible.map((person) => {
            const handle = handleFor(person);
            const pending = isPendingRequest(person);
            return (
              <li key={person.id} className={styles.person}>
                <span className={styles.mark} aria-hidden>
                  {person.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={person.photoUrl} alt="" />
                  ) : (
                    person.initials
                  )}
                </span>
                <span className={styles.copy}>
                  <span className={styles.name}>{person.name}</span>
                  <span className={styles.meta}>
                    {pending
                      ? `@${handle} · ${
                          person.invite === "sent"
                            ? "Request sent"
                            : "Request received"
                        }`
                      : `@${handle} · ${labelForRelation(person.relation)}${
                          person.onCurrentTrip ? " · on a trip with you" : ""
                        }`}
                  </span>
                </span>
                <span className={styles.actions}>
                  <PersonRowMenu
                    name={person.name}
                    items={[
                      {
                        label: "View profile",
                        onSelect: () => setProfileId(person.id),
                      },
                      ...(person.invite === "sent"
                        ? [
                            {
                              label: "Copy invite link",
                              onSelect: () => copyInviteLink(person.id),
                            },
                          ]
                        : []),
                      ...(person.invite === "received"
                        ? [
                            {
                              label: "Accept",
                              onSelect: () =>
                                onChange(
                                  connections.map((item) =>
                                    item.id === person.id
                                      ? { ...item, invite: "connected" as const }
                                      : item,
                                  ),
                                ),
                            },
                          ]
                        : []),
                      {
                        label: pending
                          ? person.invite === "sent"
                            ? "Cancel request"
                            : "Decline"
                          : "Remove connection",
                        danger: true,
                        onSelect: () => askRemovePerson(person),
                      },
                    ]}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.empty}>
          {peopleQuery.trim()
            ? "No one matches that name."
            : peopleList === "requests"
              ? requestFilter === "sent"
                ? "No requests sent."
                : requestFilter === "received"
                  ? "No requests received."
                  : "No requests."
              : "No connects yet."}
        </p>
      )}

      {adding ? (
        <div ref={addRef} className={styles.add}>
          <OutlineField
            label="Name"
            value={personName}
            onChange={setPersonName}
          />
          <OutlineField
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={personEmail}
            onChange={setPersonEmail}
          />
          <div className={planner.fieldMax}>
            <Select
              fieldLabel="Relation"
              label="Relation"
              value={personRelation}
              onChange={setPersonRelation}
              options={RELATIONS}
            />
          </div>
          <div className={styles.addActions}>
            <button
              type="button"
              className={planner.textBtn}
              disabled={!personName.trim() || !isEmail(personEmail.trim())}
              onClick={addPerson}
            >
              {peopleList === "requests" ? "Send request" : "Add person"}
            </button>
            {peopleList === "requests" && lastInviteId ? (
              <button
                type="button"
                className={planner.textBtn}
                onClick={() => copyInviteLink(lastInviteId)}
              >
                Copy invite link
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <Modal
        open={Boolean(profilePerson)}
        onClose={() => setProfileId(null)}
        label={
          profilePerson ? `${profilePerson.name} profile` : "Connection profile"
        }
        width={400}
        compactFit
      >
        {profilePerson ? (
          <div className={styles.profile}>
            <span className={styles.profileMark} aria-hidden>
              {profilePerson.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profilePerson.photoUrl} alt="" />
              ) : (
                profilePerson.initials
              )}
            </span>
            <p className={styles.profileName}>{profilePerson.name}</p>
            <p className={styles.profileHandle}>@{handleFor(profilePerson)}</p>
            <p className={styles.profileMeta}>
              {profilePerson.invite === "sent"
                ? "Request sent"
                : profilePerson.invite === "received"
                  ? "Request received"
                  : `${labelForRelation(profilePerson.relation)}${
                      profilePerson.onCurrentTrip
                        ? " · on a trip with you"
                        : ""
                    }`}
            </p>
            {profilePerson.history.length > 0 ? (
              <div className={styles.profileHistory}>
                <p className={styles.profileHistoryLabel}>Shared trips</p>
                <p>{profilePerson.history.join(" · ")}</p>
              </div>
            ) : null}
            {isConfirmedConnection(profilePerson) ? (
              <button
                type="button"
                className={styles.remove}
                onClick={() => askRemovePerson(profilePerson)}
              >
                Remove connection
              </button>
            ) : profilePerson.invite === "received" ? (
              <div className={styles.profileActions}>
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => {
                    onChange(
                      connections.map((item) =>
                        item.id === profilePerson.id
                          ? { ...item, invite: "connected" }
                          : item,
                      ),
                    );
                    setProfileId(null);
                  }}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => askRemovePerson(profilePerson)}
                >
                  Decline
                </button>
              </div>
            ) : (
              <div className={styles.profileActions}>
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => copyInviteLink(profilePerson.id)}
                >
                  Copy invite link
                </button>
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => askRemovePerson(profilePerson)}
                >
                  Cancel request
                </button>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <ConfirmDeleteModal
        open={Boolean(pendingConfirm)}
        kind={pendingConfirm?.kind ?? "remove-connection"}
        subject={pendingConfirm?.subject ?? ""}
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => {
          const next = pendingConfirm;
          setPendingConfirm(null);
          if (next) removeConnection(next.id);
        }}
      />
    </div>
  );
}

function PersonRowMenu({
  name,
  items,
}: {
  name: string;
  items: { label: string; danger?: boolean; onSelect: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);

  return (
    <>
      <IconButton
        ref={setAnchor}
        label={`Actions for ${name}`}
        size="sm"
        variant="ghost"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal size={16} strokeWidth={2} />
      </IconButton>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchor={anchor}
        placement="bottom"
        align="end"
        offset={4}
        width={220}
        label={`Actions for ${name}`}
        className={styles.menu}
      >
        <div className={styles.menuList} role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={cn(styles.menuItem, item.danger && styles.menuDanger)}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Popover>
    </>
  );
}

function labelForRelation(relation: HouseholdRelation | undefined) {
  return RELATIONS.find((item) => item.value === relation)?.label ?? "Friend";
}

function handleFor(person: Connection) {
  return person.handle || normaliseHandle(person.name) || "person";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function inviteLinkFor(id: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/invite/${id}`;
}

function uniqueHandle(name: string, people: Connection[]) {
  const used = new Set(people.map((person) => handleFor(person)));
  const base = normaliseHandle(name) || "person";
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}

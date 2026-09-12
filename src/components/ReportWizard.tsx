"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LocationPicker } from "./LocationPicker";
import { createSubmission } from "@/app/report/actions";
import {
  FRAME_HELP,
  FRAME_LABELS,
  FRAME_TYPES,
  FrameType,
  WHATS_NEARBY,
  WHATS_NEARBY_LABELS,
  WHATS_WRONG,
  WHATS_WRONG_LABELS,
  WHEN_NOTICED,
  WHEN_NOTICED_LABELS,
  WhatsNearby,
  WhatsWrong,
  WhenNoticed,
} from "@/lib/domain/types";

const STEPS = ["Locate", "Photos", "What you see", "Details", "Review"] as const;

type Shot = { frameType: FrameType; dataUrl: string; name: string };

/** Resize in the browser so the payload stays small and nothing large is uploaded. */
async function toDataUrl(file: File, max = 1100): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.72);
}

const card = "rounded-card border border-line bg-surface p-5 sm:p-6";
const field =
  "w-full rounded-md border border-line-strong bg-surface px-3 py-2.5 text-[15px] text-body placeholder:text-muted";
const primary =
  "rounded-md bg-forest px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-hover disabled:opacity-50";
const secondary =
  "rounded-md border border-line-strong px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-canvas disabled:opacity-50";

function Chip({
  checked,
  onChange,
  children,
  name,
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
  name: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3.5 py-3 text-sm transition ${
        checked
          ? "border-forest bg-mist font-medium text-deep"
          : "border-line-strong bg-surface text-body hover:bg-canvas"
      }`}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 shrink-0 accent-[#176b3a]"
      />
      {children}
    </label>
  );
}

export function ReportWizard() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const summaryRef = useRef<HTMLDivElement>(null);

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [wrong, setWrong] = useState<WhatsWrong[]>([]);
  const [nearby, setNearby] = useState<WhatsNearby[]>([]);
  const [when, setWhen] = useState<WhenNoticed | "">("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);

  function toggle<T>(list: T[], set: (v: T[]) => void, value: T) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function addPhotos(frameType: FrameType, files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const added: Shot[] = [];
      for (const file of Array.from(files).slice(0, 5 - shots.length)) {
        added.push({ frameType, dataUrl: await toDataUrl(file), name: file.name });
      }
      setShots((s) => [...s, ...added].slice(0, 5));
    } finally {
      setBusy(false);
    }
  }

  /** Local checks mirror the server contract so nobody reaches Review blocked. */
  function checkStep(i: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (i === 0 && (lat == null || lng == null)) {
      e.location = "Place the pin on the tree before continuing.";
    }
    if (i === 1) {
      if (shots.length < 3) e.photos = "Add at least three photographs.";
      if (!shots.some((s) => s.frameType === "full_tree")) {
        e.full_tree = "One photo must show the whole tree, ground to top.";
      }
    }
    if (i === 2) {
      if (!wrong.length) e.whatsWrong = "Choose at least one thing that looks wrong.";
      if (!nearby.length) e.whatsNearby = "Choose at least one thing that's nearby.";
      if (!when) e.whenNoticed = "Choose when you noticed it.";
    }
    if (i === 3) {
      const len = description.trim().length;
      if (len < 10) e.description = "Describe what you see — at least 10 characters.";
      if (len > 1000) e.description = "Keep the description under 1,000 characters.";
    }
    return e;
  }

  function next() {
    const e = checkStep(step);
    setErrors(e);
    if (Object.keys(e).length) {
      summaryRef.current?.focus();
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function submit() {
    const e = { ...checkStep(0), ...checkStep(1), ...checkStep(2), ...checkStep(3) };
    setErrors(e);
    if (Object.keys(e).length) {
      summaryRef.current?.focus();
      return;
    }
    start(async () => {
      const res = await createSubmission({
        lat: lat!,
        lng: lng!,
        accuracyM,
        description,
        whatsWrong: wrong,
        whatsNearby: nearby,
        whenNoticed: when as WhenNoticed,
        reporterName: name || null,
        reporterContact: contact || null,
        photos: shots.map((s) => ({ frameType: s.frameType, dataUrl: s.dataUrl })),
      });
      if (res.ok) router.push(`/ticket/${res.reference}`);
      else {
        setErrors(res.errors);
        summaryRef.current?.focus();
      }
    });
  }

  const errorList = Object.entries(errors);

  return (
    <div className="space-y-5">
      {/* Progress */}
      <ol className="flex flex-wrap gap-1.5" aria-label="Report progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <div
              aria-current={i === step ? "step" : undefined}
              className={`rounded-md px-2 py-2 text-center text-xs font-semibold transition ${
                i < step
                  ? "bg-mist text-forest"
                  : i === step
                    ? "bg-forest text-white"
                    : "bg-surface text-muted ring-1 ring-line"
              }`}
            >
              <span className="hidden sm:inline">{i + 1}. </span>
              {s}
            </div>
          </li>
        ))}
      </ol>

      {/* Error summary */}
      {errorList.length > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-card border border-critical/40 bg-critical-bg p-4"
        >
          <h2 className="text-sm font-semibold text-critical">
            {errorList.length === 1
              ? "There is one thing to fix"
              : `There are ${errorList.length} things to fix`}
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-critical">
            {errorList.map(([k, v]) => (
              <li key={k}>{v}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------------- 1. Locate ---------------- */}
      {step === 0 && (
        <div className={card}>
          <div className="rounded border-l-4 border-high bg-high-bg px-4 py-3">
            <h2 className="text-sm font-semibold text-high">Before you go outside</h2>
            <p className="mt-1 text-sm leading-relaxed text-body">
              Stay on the sidewalk or your own property. Never climb, touch or shake a
              tree, and never stand under a hanging branch. If the tree is on a power
              line, do not approach — call Nova Scotia Power&rsquo;s 24-hour line. If it
              has fallen across a road or onto an occupied building, call 911.
            </p>
          </div>

          <h2 className="mt-6 text-lg">Where is the tree?</h2>
          <p className="mt-1 text-sm text-muted">
            We only need the spot, not your address.
          </p>
          <div className="mt-4">
            <LocationPicker
              lat={lat}
              lng={lng}
              onChange={(a, b, acc) => {
                setLat(a);
                setLng(b);
                setAccuracyM(acc);
              }}
            />
          </div>
        </div>
      )}

      {/* ---------------- 2. Photos ---------------- */}
      {step === 1 && (
        <div className={card}>
          <h2 className="text-lg">Photographs</h2>
          <p className="mt-1 text-sm text-muted">
            Three at minimum, five at most. Take them from a safe distance — a wide shot
            is more useful to forestry than a close one.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {FRAME_TYPES.filter((f) => f !== "extra").map((frame) => {
              const has = shots.filter((s) => s.frameType === frame).length;
              const required = frame === "full_tree";
              return (
                <div
                  key={frame}
                  className={`rounded-md border p-4 ${
                    has ? "border-forest bg-mist/50" : "border-line-strong bg-surface"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-ink">
                        {FRAME_LABELS[frame]}
                        {required && <span className="ml-1 text-critical">*</span>}
                      </h3>
                      <p className="mt-0.5 text-xs leading-snug text-muted">
                        {FRAME_HELP[frame]}
                      </p>
                    </div>
                    {has > 0 && (
                      <span className="shrink-0 rounded-full bg-forest px-2 py-0.5 text-[11px] font-bold text-white">
                        {has}
                      </span>
                    )}
                  </div>
                  <label className="mt-3 inline-block cursor-pointer rounded-md border border-line-strong px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas">
                    {has ? "Add another" : "Add photo"}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      disabled={shots.length >= 5 || busy}
                      onChange={(e) => {
                        void addPhotos(frame, e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              );
            })}
          </div>

          {shots.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                {shots.length} of 5 added
              </h3>
              <ul className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {shots.map((s, i) => (
                  <li key={i} className="min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.dataUrl}
                      alt={`${FRAME_LABELS[s.frameType]} — photo ${i + 1}`}
                      className="aspect-square w-full rounded border border-line object-cover"
                    />
                    <p className="mt-1 truncate text-[11px] text-muted">
                      {FRAME_LABELS[s.frameType]}
                    </p>
                    <button
                      type="button"
                      className="text-[11px] font-medium text-critical underline-offset-2 hover:underline"
                      onClick={() => setShots((x) => x.filter((_, j) => j !== i))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ---------------- 3. Conditions ---------------- */}
      {step === 2 && (
        <div className="space-y-5">
          <fieldset className={card}>
            <legend className="text-lg">What looks wrong?</legend>
            <p className="mt-1 text-sm text-muted">Choose everything that applies.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {WHATS_WRONG.map((w) => (
                <Chip
                  key={w}
                  name="whats_wrong"
                  checked={wrong.includes(w)}
                  onChange={() => toggle(wrong, setWrong, w)}
                >
                  {WHATS_WRONG_LABELS[w]}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset className={card}>
            <legend className="text-lg">What&rsquo;s nearby?</legend>
            <p className="mt-1 text-sm text-muted">
              What is underneath it, or would be in the way if it came down.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {WHATS_NEARBY.map((w) => (
                <Chip
                  key={w}
                  name="whats_nearby"
                  checked={nearby.includes(w)}
                  onChange={() => toggle(nearby, setNearby, w)}
                >
                  {WHATS_NEARBY_LABELS[w]}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset className={card}>
            <legend className="text-lg">When did you notice it?</legend>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {WHEN_NOTICED.map((w) => (
                <label
                  key={w}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3.5 py-3 text-sm transition ${
                    when === w
                      ? "border-forest bg-mist font-medium text-deep"
                      : "border-line-strong bg-surface text-body hover:bg-canvas"
                  }`}
                >
                  <input
                    type="radio"
                    name="when_noticed"
                    checked={when === w}
                    onChange={() => setWhen(w)}
                    className="h-4 w-4 accent-[#176b3a]"
                  />
                  {WHEN_NOTICED_LABELS[w]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {/* ---------------- 4. Details ---------------- */}
      {step === 3 && (
        <div className={card}>
          <h2 className="text-lg">Describe what you see</h2>
          <p className="mt-1 text-sm text-muted">
            In your own words. What made you report it?
          </p>
          <textarea
            id="description"
            rows={6}
            maxLength={1000}
            className={`${field} mt-4`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="The maple on the boulevard is leaning over the sidewalk and there's a broken branch caught up in it…"
          />
          <p className="mt-1.5 text-xs tabular-nums text-muted">
            {description.trim().length} / 1,000 — at least 10
          </p>

          <div className="mt-6 border-t border-line pt-5">
            <h3 className="text-sm font-semibold text-ink">Optional</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Only used if forestry needs to reach you. Your name and contact are never
              sent to the scoring service.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="nm" className="block text-xs font-semibold uppercase tracking-wide text-muted">
                  Name
                </label>
                <input
                  id="nm"
                  className={`${field} mt-1.5`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="ct" className="block text-xs font-semibold uppercase tracking-wide text-muted">
                  Email or phone
                </label>
                <input
                  id="ct"
                  className={`${field} mt-1.5`}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 5. Review ---------------- */}
      {step === 4 && (
        <div className={card}>
          <h2 className="text-lg">Check and submit</h2>

          <dl className="mt-4 divide-y divide-line text-sm">
            <div className="flex gap-4 py-3">
              <dt className="w-32 shrink-0 text-muted">Location</dt>
              <dd className="font-mono tabular-nums text-body">
                {lat?.toFixed(5)}, {lng?.toFixed(5)}
              </dd>
            </div>
            <div className="flex gap-4 py-3">
              <dt className="w-32 shrink-0 text-muted">Photos</dt>
              <dd className="min-w-0 flex-1">
                <ul className="flex flex-wrap gap-2">
                  {shots.map((s, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <li key={i}>
                      <img
                        src={s.dataUrl}
                        alt={FRAME_LABELS[s.frameType]}
                        className="h-16 w-16 rounded border border-line object-cover"
                      />
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            <div className="flex gap-4 py-3">
              <dt className="w-32 shrink-0 text-muted">Looks wrong</dt>
              <dd className="text-body">
                {wrong.map((w) => WHATS_WRONG_LABELS[w]).join(", ")}
              </dd>
            </div>
            <div className="flex gap-4 py-3">
              <dt className="w-32 shrink-0 text-muted">Nearby</dt>
              <dd className="text-body">
                {nearby.map((w) => WHATS_NEARBY_LABELS[w]).join(", ")}
              </dd>
            </div>
            <div className="flex gap-4 py-3">
              <dt className="w-32 shrink-0 text-muted">Noticed</dt>
              <dd className="text-body">{when && WHEN_NOTICED_LABELS[when]}</dd>
            </div>
            <div className="flex gap-4 py-3">
              <dt className="w-32 shrink-0 text-muted">Description</dt>
              <dd className="min-w-0 flex-1 leading-relaxed text-body">{description}</dd>
            </div>
          </dl>

          <p className="mt-5 rounded border-l-2 border-line-strong bg-canvas px-4 py-3 text-sm leading-relaxed text-muted">
            You&rsquo;ll get a ticket number straight away. A preliminary assessment is
            prepared for forestry staff — it is not a decision about the tree, and a
            qualified inspection remains the final word.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className={secondary}
          disabled={step === 0 || pending}
          onClick={() => {
            setErrors({});
            setStep((s) => Math.max(0, s - 1));
          }}
        >
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button type="button" className={primary} disabled={busy || pending} onClick={next}>
            Continue
          </button>
        ) : (
          <button type="button" className={primary} disabled={pending} onClick={submit}>
            {pending ? "Submitting…" : "Submit report"}
          </button>
        )}
      </div>
    </div>
  );
}

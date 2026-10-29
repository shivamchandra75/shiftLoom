import React, { useState } from "react";
import { Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { FormField } from "@/components/ui/FormField";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/button";
import { parseYmd, toHm, toYmd } from "@/src/lib/utils";

// "YYYY-MM-DD" / "HH:MM" → Date for the picker; empty means now
const toDate = (mode: "date" | "time", value: string) => {
  if (!value) return new Date();
  if (mode === "date") return parseYmd(value);
  const d = new Date();
  const [h, m] = value.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
};

// Date or time form field. Android opens the system dialog; iOS opens a spinner in a bottom sheet.
export function DateTimeField({
  label,
  mode,
  value,
  display,
  error,
  onChange,
}: {
  label: string;
  mode: "date" | "time";
  /** "YYYY-MM-DD" or "HH:MM" */
  value: string;
  /** Text shown in the field, e.g. "Fri, 30 Oct 2026" */
  display: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(new Date());
  const minimumDate = mode === "date" ? new Date() : undefined;
  const commit = (d: Date) => onChange(mode === "date" ? toYmd(d) : toHm(d));

  return (
    <>
      <FormField
        label={label}
        value={display}
        placeholder={mode === "date" ? "Select a date" : "Select a time"}
        leadingIcon={mode === "date" ? "calendar_today" : "schedule"}
        error={error}
        onPress={() => {
          setDraft(toDate(mode, value));
          setOpen(true);
        }}
      />
      {Platform.OS === "android" && open && (
        <DateTimePicker
          mode={mode}
          value={draft}
          minimumDate={minimumDate}
          onChange={(e, d) => {
            setOpen(false);
            if (e.type === "set" && d) commit(d);
          }}
        />
      )}
      {Platform.OS === "ios" && (
        <BottomSheet
          visible={open}
          onDismiss={() => setOpen(false)}
          title={label}
          footer={
            <Button
              label="Done"
              className="flex-1"
              onPress={() => {
                commit(draft);
                setOpen(false);
              }}
            />
          }
        >
          <DateTimePicker mode={mode} value={draft} display="spinner" minimumDate={minimumDate} onChange={(_, d) => d && setDraft(d)} />
        </BottomSheet>
      )}
    </>
  );
}

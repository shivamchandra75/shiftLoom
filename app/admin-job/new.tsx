import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Platform, Alert } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { OutlinedInput } from "@/components/ui/outlined-input";
import { LocationPicker } from "@/components/LocationPicker";
import { SuggestionList } from "@/components/ui/suggestion-list";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { Dropdown } from "@/components/ui/dropdown";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useJobStore } from "@/src/store/useJobStore";
import { formatDate, formatTimeTo12Hour, toHm, toYmd } from "@/src/lib/utils";
import { errorsForStep, JobFormErrors, JobFormStep, JobFormValues, RoleRow, validateJobForm } from "@/src/lib/validateJobForm";
import { searchCompanies, type JobRole } from "@/src/services/jobService";

const ROLE_OPTIONS = [
  { label: "Driver", value: "driver" },
  { label: "Steward", value: "steward" },
  { label: "Chef", value: "chef" },
];

const STEP_TITLES = { 1: "Company & location", 2: "Date & time", 3: "Roles & pay" } as const;

const newRoleRow = (): RoleRow => ({ key: String(Date.now() + Math.random()), role: "", slots: "1", wage: "" });

// "YYYY-MM-DD" / "HH:MM" → Date for the picker
const toDate = (mode: "date" | "time", value: string) => {
  const d = new Date();
  if (!value) return d;
  if (mode === "date") return new Date(`${value}T00:00:00`);
  const [h, m] = value.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
};

function PickerField({ label, mode, value, display, error, onChange }: {
  label: string;
  mode: "date" | "time";
  value: string;
  display: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const minimumDate = mode === "date" ? new Date() : undefined;
  const handle = (_: unknown, d?: Date) => {
    setOpen(false);
    if (d) onChange(mode === "date" ? toYmd(d) : toHm(d));
  };

  return (
    <View className="flex-1 gap-1">
      <Text className={`text-label-medium ${error ? "text-error" : "text-on-surface-variant"}`}>{label}</Text>
      {Platform.OS === "ios" ? (
        // iOS compact picker is its own tappable pill, no open/close state needed
        <DateTimePicker mode={mode} display="compact" value={toDate(mode, value)} minimumDate={minimumDate} onChange={handle} style={{ alignSelf: "flex-start" }} />
      ) : (
        <>
          <Pressable
            onPress={() => setOpen(true)}
            className={`border rounded-xl px-4 py-3.5 ${error ? "border-error" : "border-outline-variant"}`}
          >
            <Text className={value ? "text-on-surface" : "text-on-surface-variant"}>{value ? display : `Select ${mode}`}</Text>
          </Pressable>
          {open && <DateTimePicker mode={mode} value={toDate(mode, value)} minimumDate={minimumDate} onChange={handle} />}
        </>
      )}
      {!!error && <Text className="text-body-small text-error">{error}</Text>}
    </View>
  );
}

// Compact read-only recap of earlier steps, with a jump back to edit
function SummaryCard({ rows, onEdit }: { rows: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }[]; onEdit: () => void }) {
  return (
    <View className="flex-row items-start gap-3 bg-surface-variant rounded-2xl p-4">
      <View className="flex-1 gap-2">
        {rows.map((r) => (
          <View key={r.icon} className="flex-row items-start gap-2">
            <MaterialCommunityIcons name={r.icon} size={18} color="#444746" />
            <Text className="flex-1 text-body-medium text-on-surface" numberOfLines={2}>{r.text}</Text>
          </View>
        ))}
      </View>
      <Pressable onPress={onEdit} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit">
        <Text className="text-label-large font-bold text-primary">Edit</Text>
      </Pressable>
    </View>
  );
}

export default function PostJobScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { createAdminJob } = useJobStore();
  const scrollRef = useRef<React.ComponentRef<typeof KeyboardAwareScrollView>>(null);
  const leaving = useRef(false);

  const [step, setStep] = useState<JobFormStep>(1);
  const [values, setValues] = useState<JobFormValues>({
    companyName: "",
    locationAddress: "",
    coords: null,
    date: "",
    startTime: "",
    endTime: "",
    roles: [newRoleRow()],
  });
  const [errors, setErrors] = useState<JobFormErrors>({});
  const [triedSteps, setTriedSteps] = useState<JobFormStep[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Company autocomplete: suggestions until the admin picks one (or keeps typing a new name)
  const [pickedCompany, setPickedCompany] = useState("");
  const searchingCompany = values.companyName.trim() !== pickedCompany;
  const companies = useDebouncedSearch(values.companyName, searchCompanies, { minLength: 2, delay: 300, enabled: searchingCompany });

  // Header back / Android back goes to the previous step instead of leaving the form
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (e) => {
        if (leaving.current || step === 1) return;
        e.preventDefault();
        setStep((s) => (s - 1) as JobFormStep);
      }),
    [navigation, step]
  );

  // Once a step has been attempted, re-validate it on every change so errors clear as the admin fixes them
  const update = (patch: Partial<JobFormValues>) => {
    const next = { ...values, ...patch };
    setValues(next);
    if (triedSteps.includes(step)) setErrors(errorsForStep(validateJobForm(next), step));
  };
  const updateRole = (key: string, patch: Partial<RoleRow>) =>
    update({ roles: values.roles.map((r) => (r.key === key ? { ...r, ...patch } : r)) });

  const goTo = (next: JobFormStep) => {
    setErrors({});
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  // Validate only the current step; returns true when it is clean
  const checkStep = () => {
    if (!triedSteps.includes(step)) setTriedSteps([...triedSteps, step]);
    const found = errorsForStep(validateJobForm(values), step);
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const handleNext = () => {
    if (checkStep()) goTo((step + 1) as JobFormStep);
  };

  const handleSubmit = async () => {
    if (isSubmitting || !user?.id || !checkStep()) return;
    setIsSubmitting(true);
    try {
      await createAdminJob(
        {
          companyName: values.companyName.trim(),
          locationAddress: values.locationAddress.trim(),
          latitude: values.coords!.latitude,
          longitude: values.coords!.longitude,
          date: values.date,
          startTime: values.startTime,
          endTime: values.endTime,
          roles: values.roles.map((r) => ({
            role: r.role as JobRole["role"],
            totalSlots: Number(r.slots),
            wageInr: Number(r.wage),
          })),
        },
        user.id
      );
      leaving.current = true;
      Alert.alert("Job posted", "Workers with matching roles can now see it.");
      router.back();
    } catch (e: any) {
      // Keep the form filled so nothing is lost; the admin can retry
      Alert.alert("Couldn't post job", e?.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const usedRoles = values.roles.map((r) => r.role);
  const placeRows = [
    { icon: "office-building-outline" as const, text: values.companyName.trim() },
    { icon: "map-marker-outline" as const, text: values.locationAddress.trim() },
  ];
  const timeRow = {
    icon: "calendar-clock" as const,
    text: values.date ? `${formatDate(values.date)} · ${formatTimeTo12Hour(values.startTime)} – ${formatTimeTo12Hour(values.endTime)}` : "",
  };

  return (
    <View className="flex-1 bg-background">
      {/* Step indicator */}
      <View className="px-6 pt-4 pb-2 gap-2">
        <View className="flex-row gap-2">
          {[1, 2, 3].map((n) => (
            <View key={n} className={`flex-1 h-1 rounded-full ${n <= step ? "bg-primary" : "bg-outline"}`} />
          ))}
        </View>
        <Text className="text-label-medium text-on-surface-variant">
          Step {step} of 3 · {STEP_TITLES[step]}
        </Text>
      </View>

      <KeyboardAwareScrollView
        ref={scrollRef}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 24, paddingTop: 8, gap: 20 }}
      >
        {step === 1 && (
          <>
            <View className="gap-2">
              <OutlinedInput
                label="Company name"
                value={values.companyName}
                onChangeText={(companyName) => update({ companyName })}
                placeholder="Search or enter a new company"
                error={errors.companyName}
              />
              {searchingCompany && values.companyName.trim().length >= 2 && (
                <SuggestionList
                  items={companies.results}
                  loading={companies.loading}
                  error={companies.error}
                  icon="office-building-outline"
                  labelOf={(name) => name}
                  onSelect={(name) => {
                    setPickedCompany(name);
                    update({ companyName: name });
                  }}
                  emptyText={companies.loading ? undefined : `No match. "${values.companyName.trim()}" will be added as a new company.`}
                />
              )}
            </View>

            <LocationPicker
              address={values.locationAddress}
              coords={values.coords}
              addressError={errors.locationAddress}
              coordsError={errors.coords}
              onChange={(patch) => update(patch)}
            />
          </>
        )}

        {step === 2 && (
          <>
            <SummaryCard rows={placeRows} onEdit={() => goTo(1)} />
            <PickerField
              label="Date"
              mode="date"
              value={values.date}
              display={values.date && formatDate(values.date)}
              error={errors.date}
              onChange={(date) => update({ date })}
            />
            <View className="flex-row gap-4">
              <PickerField
                label="Start time"
                mode="time"
                value={values.startTime}
                display={values.startTime && formatTimeTo12Hour(values.startTime)}
                error={errors.startTime}
                onChange={(startTime) => update({ startTime })}
              />
              <PickerField
                label="End time"
                mode="time"
                value={values.endTime}
                display={values.endTime && formatTimeTo12Hour(values.endTime)}
                error={errors.endTime}
                onChange={(endTime) => update({ endTime })}
              />
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <SummaryCard rows={[...placeRows, timeRow]} onEdit={() => goTo(1)} />
            <View className="gap-3">
              <Text className="text-title-medium font-bold text-on-surface">Roles</Text>
              {!!errors.roles && <Text className="text-body-small text-error">{errors.roles}</Text>}

              {values.roles.map((r) => (
                <View key={r.key} className="border border-outline rounded-2xl p-4 gap-3">
                  <View className="flex-row items-start gap-2">
                    <View className="flex-1">
                      <Dropdown
                        label="Role"
                        value={r.role}
                        options={ROLE_OPTIONS.filter((o) => o.value === r.role || !usedRoles.includes(o.value as RoleRow["role"]))}
                        onSelect={(role) => updateRole(r.key, { role: role as RoleRow["role"] })}
                        placeholder="Select role"
                        error={errors[`role.${r.key}.role`]}
                      />
                    </View>
                    {values.roles.length > 1 && (
                      <Pressable
                        onPress={() => update({ roles: values.roles.filter((x) => x.key !== r.key) })}
                        accessibilityLabel="Remove role"
                        hitSlop={8}
                        className="p-2 mt-6"
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={22} color="#B3261E" />
                      </Pressable>
                    )}
                  </View>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <OutlinedInput
                        label="Slots"
                        value={r.slots}
                        onChangeText={(slots) => updateRole(r.key, { slots })}
                        keyboardType="numeric"
                        error={errors[`role.${r.key}.slots`]}
                      />
                    </View>
                    <View className="flex-1">
                      <OutlinedInput
                        label="Wage (₹/shift)"
                        value={r.wage}
                        onChangeText={(wage) => updateRole(r.key, { wage })}
                        keyboardType="numeric"
                        placeholder="700"
                        error={errors[`role.${r.key}.wage`]}
                      />
                    </View>
                  </View>
                </View>
              ))}

              {values.roles.length < ROLE_OPTIONS.length && (
                <Pressable
                  onPress={() => update({ roles: [...values.roles, newRoleRow()] })}
                  className="flex-row items-center justify-center gap-2 py-3 rounded-full border border-dashed border-outline active:opacity-70"
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#0B57D0" />
                  <Text className="text-label-large font-bold text-primary">Add role</Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </KeyboardAwareScrollView>

      {/* Step actions */}
      <View className="flex-row gap-3 px-6 pt-3 border-t border-outline bg-background" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        {step > 1 && (
          <View className="flex-1">
            <SecondaryButton label="Back" onPress={() => goTo((step - 1) as JobFormStep)} disabled={isSubmitting} />
          </View>
        )}
        <View className="flex-1">
          {step < 3 ? (
            <PrimaryButton label="Next" onPress={handleNext} />
          ) : (
            <PrimaryButton label="Post Job" onPress={handleSubmit} loading={isSubmitting} disabled={isSubmitting} />
          )}
        </View>
      </View>
    </View>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useJobStore } from "@/src/store/useJobStore";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { searchCompanies, type JobRole } from "@/src/services/jobService";
import { searchPlacesInIndia } from "@/src/services/geocodeService";
import { formatInr, formatTimeRange, shiftDateParts, shiftHours } from "@/src/lib/utils";
import { errorsForStep, JobFormErrors, JobFormStep, JobFormValues, RoleRow, validateJobForm } from "@/src/lib/validateJobForm";
import { Screen, BottomActionBar } from "@/components/ui/Screen";
import { TopAppBarSmall } from "@/components/ui/TopAppBar";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/FormField";
import { ListItem } from "@/components/ui/ListItem";
import { Result } from "@/components/ui/Result";
import { Dialog } from "@/components/ui/Dialog";
import { Suggestion, SuggestionList } from "@/components/ui/suggestion-list";
import { StepIndicator } from "@/components/StepIndicator";
import { LocationPicker, formatCoords } from "@/components/LocationPicker";
import { DateTimeField } from "@/components/DateTimeField";
import { RoleCard } from "@/components/RoleCard";

type Step = JobFormStep | 4;
type Phase = "editing" | "posting" | "posted" | "failed";

const STEP_TITLES: Record<Step, string> = { 1: "Company & location", 2: "Date & time", 3: "Roles & pay", 4: "Review" };

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const newRoleRow = (): RoleRow => ({ key: String(Date.now() + Math.random()), role: "", slots: "1", wage: "" });
const emptyForm = (): JobFormValues => ({ companyName: "", locationAddress: "", coords: null, date: "", startTime: "", endTime: "", roles: [newRoleRow()] });

// "Fri, 30 Oct 2026"
const longDate = (ymd: string) => {
  const { weekday, day, month } = shiftDateParts(ymd);
  return `${weekday}, ${day} ${month} ${ymd.slice(0, 4)}`;
};

// "chefs, stewards" → "Chefs and stewards"
const joinRoles = (roles: RoleRow[]) => {
  const names = roles.map((r) => `${r.role}s`);
  return capitalize(names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0]);
};

const slotsOf = (r: RoleRow) => Math.max(1, parseInt(r.slots, 10) || 1);

// "09:00" → "9:00 AM"
const clock = (hm: string) => formatTimeRange(hm, hm, false).split(" – ")[0];

// Compact summary of an earlier step, with a jump back to edit it
function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <View className="overflow-hidden rounded-xl bg-surface">
      <View className="flex-row items-center pl-4 pr-1 pt-2">
        <Text variant="title-small" color="on-surface-variant" className="flex-1">{title}</Text>
        <Button variant="text" label="Edit" onPress={onEdit} accessibilityLabel={`Edit ${title.toLowerCase()}`} />
      </View>
      {children}
    </View>
  );
}

export default function PostShiftScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { createAdminJob } = useJobStore();
  const scrollRef = useRef<React.ComponentRef<typeof KeyboardAwareScrollView>>(null);
  const leaving = useRef(false);
  const pendingLeave = useRef<Parameters<typeof navigation.dispatch>[0] | null>(null);

  const [step, setStep] = useState<Step>(1);
  const [phase, setPhase] = useState<Phase>("editing");
  const [values, setValues] = useState<JobFormValues>(emptyForm);
  const [errors, setErrors] = useState<JobFormErrors>({});
  const [triedSteps, setTriedSteps] = useState<Step[]>([]);
  const [postedId, setPostedId] = useState<string | null>(null);
  const [failMessage, setFailMessage] = useState("");
  const [discardOpen, setDiscardOpen] = useState(false);

  // Company and address autocomplete: suggestions stay open until one is picked or the admin keeps typing
  const [pickedCompany, setPickedCompany] = useState("");
  const [pickedAddress, setPickedAddress] = useState("");
  const typedCompany = values.companyName.trim();
  const typedAddress = values.locationAddress.trim();
  const searchingCompany = typedCompany !== pickedCompany;
  const searchingAddress = typedAddress !== pickedAddress.trim();
  const companies = useDebouncedSearch(values.companyName, searchCompanies, { minLength: 2, delay: 300, enabled: searchingCompany });
  const places = useDebouncedSearch(values.locationAddress, searchPlacesInIndia, { minLength: 3, delay: 400, enabled: searchingAddress });

  const dirty = !!(typedCompany || typedAddress || values.coords || values.date || values.startTime || values.endTime || values.roles.some((r) => r.role || r.wage));

  // Android back and the header back go to the previous step; on step 1 they ask before discarding
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (e) => {
        if (leaving.current || phase !== "editing") return;
        e.preventDefault();
        if (step > 1) setStep((s) => (s - 1) as Step);
        else if (dirty) {
          pendingLeave.current = e.data.action;
          setDiscardOpen(true);
        } else {
          leaving.current = true;
          navigation.dispatch(e.data.action);
        }
      }),
    [navigation, step, dirty, phase]
  );

  const requestClose = () => {
    if (dirty) setDiscardOpen(true);
    else {
      leaving.current = true;
      router.back();
    }
  };

  const discard = () => {
    leaving.current = true;
    setDiscardOpen(false);
    if (pendingLeave.current) navigation.dispatch(pendingLeave.current);
    else router.back();
  };

  // Once a step has been attempted, re-validate it on every change so errors clear as the admin fixes them
  const update = (patch: Partial<JobFormValues>) => {
    const next = { ...values, ...patch };
    setValues(next);
    if (step !== 4 && triedSteps.includes(step)) setErrors(errorsForStep(validateJobForm(next), step));
  };
  const updateRole = (key: string, patch: Partial<RoleRow>) => update({ roles: values.roles.map((r) => (r.key === key ? { ...r, ...patch } : r)) });

  const goTo = (next: Step) => {
    setErrors({});
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleNext = () => {
    if (step === 4) return;
    setTriedSteps((t) => (t.includes(step) ? t : [...t, step]));
    const found = errorsForStep(validateJobForm(values), step);
    setErrors(found);
    if (Object.keys(found).length === 0) goTo((step + 1) as Step);
  };

  const handlePost = async () => {
    if (!user?.id || phase === "posting") return;
    const all = validateJobForm(values);
    const badStep = ([1, 2, 3] as const).find((s) => Object.keys(errorsForStep(all, s)).length > 0);
    if (badStep) {
      setTriedSteps((t) => [...t, badStep]);
      goTo(badStep);
      setErrors(errorsForStep(all, badStep));
      return;
    }
    setPhase("posting");
    try {
      const id = await createAdminJob(
        {
          companyName: typedCompany,
          locationAddress: typedAddress,
          latitude: values.coords!.latitude,
          longitude: values.coords!.longitude,
          date: values.date,
          startTime: values.startTime,
          endTime: values.endTime,
          roles: values.roles.map((r) => ({ role: r.role as JobRole["role"], totalSlots: slotsOf(r), wageInr: Number(r.wage) })),
        },
        user.id
      );
      setPostedId(id);
      setPhase("posted");
    } catch (e: any) {
      // The form stays filled so nothing is lost
      setFailMessage(e?.message === "Network request failed" ? "" : e?.message || "");
      setPhase("failed");
    }
  };

  const postAnother = () => {
    setValues(emptyForm());
    setErrors({});
    setTriedSteps([]);
    setPickedCompany("");
    setPickedAddress("");
    setStep(1);
    setPhase("editing");
  };

  if (phase === "posted") {
    return (
      <Screen>
        <View className="flex-1 justify-center px-4">
          <Result
            status="success"
            title="Shift posted"
            body={`${joinRoles(values.roles)} can see it now and start accepting.`}
            primaryLabel="View shift"
            onPrimary={() => router.replace({ pathname: "/admin-job/[id]", params: { id: postedId! } })}
            secondaryLabel="Post another"
            onSecondary={postAnother}
          />
        </View>
      </Screen>
    );
  }

  if (phase === "failed") {
    return (
      <Screen>
        <View className="flex-1 justify-center px-4">
          <Result
            status="failure"
            title="Couldn't post the shift"
            body={`${failMessage ? `${failMessage}. ` : "Check your connection and try again. "}Everything you entered is still here.`}
            primaryLabel="Try again"
            onPrimary={handlePost}
            secondaryLabel="Back to review"
            onSecondary={() => setPhase("editing")}
          />
        </View>
      </Screen>
    );
  }

  const usedRoles = values.roles.map((r) => r.role);
  const total = values.roles.reduce((n, r) => n + slotsOf(r) * (Number(r.wage) || 0), 0);
  const errorCount = Object.keys(errors).length;

  // Suggestions under the company field: past companies, then "Add <typed>" unless it matches one exactly
  const companyItems: Suggestion[] = [
    ...companies.results.map((c) => ({ key: c.name, title: c.name, subtitle: `${c.shifts} ${c.shifts === 1 ? "shift" : "shifts"} posted`, icon: "business" })),
    ...(typedCompany.length >= 2 && !companies.results.some((c) => c.name.toLowerCase() === typedCompany.toLowerCase())
      ? [{ key: "__new", title: `Add "${typedCompany}"`, subtitle: "New company", icon: "add_business", accent: true }]
      : []),
  ];
  const placeItems: Suggestion[] = places.results.map((p, i) => ({ key: `${i}-${p.label}`, title: p.label, icon: "location_on" }));

  return (
    <Screen>
      <TopAppBarSmall title="Post a shift" leadingIcon="close" leadingLabel="Close" onLeadingPress={requestClose} />
      <KeyboardAwareScrollView
        ref={scrollRef}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 128, gap: 20 }}
      >
        <StepIndicator step={step} total={4} title={STEP_TITLES[step]} />

        {errorCount > 0 && (
          <View accessibilityLiveRegion="polite" className="flex-row items-center gap-3 rounded-md bg-error-container px-4 py-3">
            <Icon name="error" size={20} color="on-error-container" />
            <Text variant="body-medium" color="on-error-container" className="flex-1">{`Fix ${errorCount} ${errorCount === 1 ? "field" : "fields"} to continue`}</Text>
          </View>
        )}

        {step === 1 && (
          <>
            <View className="gap-2">
              <FormField
                label="Company name"
                value={values.companyName}
                onChangeText={(companyName) => update({ companyName })}
                placeholder="Search or add a company"
                helper="Pick a past company or type a new one"
                autoCapitalize="words"
                error={errors.companyName}
              />
              {searchingCompany && typedCompany.length >= 2 && companyItems.length > 0 && (
                <SuggestionList
                  items={companyItems}
                  onSelect={(item) => {
                    setPickedCompany(item.key === "__new" ? typedCompany : item.title);
                    if (item.key !== "__new") update({ companyName: item.title });
                  }}
                />
              )}
            </View>

            <View className="gap-2">
              <FormField
                label="Address"
                value={values.locationAddress}
                onChangeText={(locationAddress) => update({ locationAddress })}
                placeholder="Search an address"
                helper="Pick a suggestion to drop the pin"
                error={errors.locationAddress}
              />
              {searchingAddress && typedAddress.length >= 3 && (
                <SuggestionList
                  items={placeItems}
                  loading={places.loading}
                  error={places.error}
                  emptyText="No places found in India. Keep typing, or pin it on the map below."
                  footer="Search © OpenStreetMap contributors"
                  onSelect={(item) => {
                    const place = places.results[placeItems.indexOf(item)];
                    setPickedAddress(place.label);
                    update({ locationAddress: place.label, coords: { latitude: place.latitude, longitude: place.longitude } });
                  }}
                />
              )}
            </View>

            <LocationPicker coords={values.coords} error={errors.coords} onChange={(coords) => update({ coords })} />
          </>
        )}

        {step === 2 && (
          <>
            <DateTimeField label="Date" mode="date" value={values.date} display={values.date ? longDate(values.date) : ""} error={errors.date} onChange={(date) => update({ date })} />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <DateTimeField
                  label="Start time"
                  mode="time"
                  value={values.startTime}
                  display={values.startTime ? clock(values.startTime) : ""}
                  error={errors.startTime}
                  onChange={(startTime) => update({ startTime })}
                />
              </View>
              <View className="flex-1">
                <DateTimeField
                  label="End time"
                  mode="time"
                  value={values.endTime}
                  display={values.endTime ? clock(values.endTime) : ""}
                  error={errors.endTime}
                  onChange={(endTime) => update({ endTime })}
                />
              </View>
            </View>
            {!!values.startTime && !!values.endTime && values.endTime > values.startTime && (
              <Text variant="body-medium" color="on-surface-variant">{`Shift length: ${shiftHours(values.startTime, values.endTime)} hours`}</Text>
            )}
          </>
        )}

        {step === 3 && (
          <>
            {errors.roles && <Text variant="body-small" color="error">{errors.roles}</Text>}
            {values.roles.map((r, i) => (
              <RoleCard
                key={r.key}
                index={i}
                row={r}
                usedRoles={usedRoles}
                canRemove={values.roles.length > 1}
                errors={errors}
                onChange={(patch) => updateRole(r.key, patch)}
                onRemove={() => update({ roles: values.roles.filter((x) => x.key !== r.key) })}
              />
            ))}
            {values.roles.length < 3 && (
              <Button variant="tonal" leadingIcon="add" label="Add role" onPress={() => update({ roles: [...values.roles, newRoleRow()] })} className="self-start" />
            )}
            <View className="flex-row items-center rounded-xl bg-surface p-4">
              <Text variant="body-large" className="flex-1">Total pay per shift</Text>
              <Text variant="title-medium">{formatInr(total)}</Text>
            </View>
          </>
        )}

        {step === 4 && (
          <>
            <ReviewSection title="Company & location" onEdit={() => goTo(1)}>
              <ListItem dense leadingIcon="storefront" headline={typedCompany} supportingText="Company" />
              <ListItem dense leadingIcon="location_on" headline={typedAddress} supportingText={values.coords ? formatCoords(values.coords) : undefined} />
            </ReviewSection>
            <ReviewSection title="Date & time" onEdit={() => goTo(2)}>
              <ListItem dense leadingIcon="event" headline={longDate(values.date)} supportingText="Date" />
              <ListItem
                dense
                leadingIcon="schedule"
                headline={formatTimeRange(values.startTime, values.endTime, false)}
                supportingText={`${shiftHours(values.startTime, values.endTime)} hours`}
              />
            </ReviewSection>
            <ReviewSection title="Roles & pay" onEdit={() => goTo(3)}>
              {values.roles.map((r) => (
                <ListItem key={r.key} dense leadingIcon="work" headline={capitalize(r.role)} supportingText={`${slotsOf(r)} ${slotsOf(r) === 1 ? "slot" : "slots"}, ${formatInr(Number(r.wage))} each`} />
              ))}
              <ListItem dense leadingIcon="payments" headline={`${formatInr(total)} per shift`} supportingText="Total pay" />
            </ReviewSection>
          </>
        )}
      </KeyboardAwareScrollView>

      <BottomActionBar>
        {step > 1 && <Button variant="outlined" label="Back" onPress={() => goTo((step - 1) as Step)} disabled={phase === "posting"} className="flex-1" />}
        {step < 4 ? (
          <Button label="Next" onPress={handleNext} className="flex-1" />
        ) : (
          <Button label="Post shift" onPress={handlePost} loading={phase === "posting"} className="flex-1" />
        )}
      </BottomActionBar>

      <Dialog
        visible={discardOpen}
        icon="delete"
        tone="error"
        title="Discard this shift?"
        body="What you've entered so far won't be saved."
        confirmLabel="Discard"
        dismissLabel="Keep editing"
        onConfirm={discard}
        onDismiss={() => {
          pendingLeave.current = null;
          setDiscardOpen(false);
        }}
      />
    </Screen>
  );
}

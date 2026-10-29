import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Platform, ScrollView, Share, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useJobStore } from "@/src/store/useJobStore";
import { colors } from "@/src/theme/tokens";
import { fetchJobAssignments, JobAssignment, JobRole } from "@/src/services/jobService";
import { canCancelShift, formatInr, formatLongDate, formatTimeRange, shiftDateParts } from "@/src/lib/utils";
import { Screen, BottomActionBar } from "@/components/ui/Screen";
import { TopAppBarSmall } from "@/components/ui/TopAppBar";
import { IconButton, BookmarkButton } from "@/components/ui/IconButton";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/Chip";
import { ListItem, Panel, Subheader } from "@/components/ui/ListItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { Snackbar, SnackbarMessage } from "@/components/ui/snackbar";
import { ReasonSheet } from "@/components/ReasonSheet";
import { jobChip } from "@/components/AdminJobListItem";

const CANCEL_REASONS = ["Weather", "Client cancelled", "Insufficient staff", "Venue unavailable", "Other"];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function AdminJobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { adminJobList, savedJobList, savedJobIds, toggleSaveJob, cancelAdminJob, isCancelling } = useJobStore();
  const job = adminJobList.find((j) => j.id === id) ?? savedJobList.find((j) => j.id === id);

  const [assignments, setAssignments] = useState<JobAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [snack, setSnack] = useState<SnackbarMessage | null>(null);
  const hideSnack = useCallback(() => setSnack(null), []);

  const load = useCallback(() => {
    setIsLoading(true);
    setError("");
    fetchJobAssignments(id)
      .then(setAssignments)
      .catch((e) => setError(e?.message === "Network request failed" ? "No internet connection. Try again." : e?.message || "Couldn't load the roster."))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(load, [load]);

  if (!job) {
    return (
      <Screen>
        <TopAppBarSmall />
        <EmptyState icon="event_busy" title="Shift not found" body="It may have been removed." />
      </Screen>
    );
  }

  const chip = jobChip(job);
  const cancellable = job.status === "open" || job.status === "closed";
  const inWindow = canCancelShift(job.date);
  const { weekday, day, month } = shiftDateParts(job.date);
  const hasPin = job.latitude != null && job.longitude != null;

  const openMaps = () => {
    const url = Platform.select({
      ios: `maps:0,0?q=${job.latitude},${job.longitude}(${job.locationAddress})`,
      android: `geo:0,0?q=${job.latitude},${job.longitude}(${job.locationAddress})`,
    });
    if (url) Linking.openURL(url);
  };

  const share = () => Share.share({ message: `${job.companyName} on ShiftLoom: ${formatLongDate(job.date)}, ${formatTimeRange(job.startTime, job.endTime)}.` }).catch(() => {});

  const handleCancel = async (reason: string) => {
    try {
      await cancelAdminJob(job.id, reason);
      setCancelOpen(false);
      setSnack({ text: "Job cancelled.", tone: "success" });
    } catch (e: any) {
      setCancelOpen(false);
      setSnack({ text: e?.message || "Couldn't cancel the job. Try again.", tone: "error" });
    }
  };

  const roster = (role: JobRole) => {
    const filled = assignments.filter((a) => a.role === role.role);
    const open = Math.max(role.totalSlots - filled.length, 0);
    return (
      <View key={role.id} className="overflow-hidden rounded-xl bg-surface">
        <View className="flex-row items-center gap-2 px-4 pb-2 pt-4">
          <Text variant="title-medium" className="flex-1">{capitalize(role.role)}</Text>
          <Text variant="body-small" color="on-surface-variant">{`${filled.length} of ${role.totalSlots} filled, ${formatInr(role.wageInr)} per shift`}</Text>
        </View>
        <Panel>
          {[
            ...filled.map((a) => (
              <ListItem
                key={a.applicationId}
                leadingIcon="person"
                headline={a.name}
                supportingText={a.email}
                trailingIcon={a.email ? "mail" : undefined}
                onPress={a.email ? () => Linking.openURL(`mailto:${a.email}`) : undefined}
                accessibilityLabel={`Email ${a.name}`}
              />
            )),
            ...Array.from({ length: open }, (_, i) => (
              <ListItem key={`open-${i}`} leadingIcon="person_add" headline="Open slot" supportingText={`Waiting for a ${role.role} to accept`} />
            )),
          ]}
        </Panel>
      </View>
    );
  };

  return (
    <Screen>
      <TopAppBarSmall
        trailing={
          <>
            <IconButton icon="share" accessibilityLabel="Share shift" onPress={share} />
            <BookmarkButton saved={savedJobIds.includes(job.id)} onToggle={() => user?.id && toggleSaveJob(job, user.id)} />
          </>
        }
      />
      <ScrollView contentContainerClassName={`gap-4 px-4 pt-2 ${cancellable ? "pb-32" : "pb-8"}`}>
        <View className="gap-2">
          <Text variant="headline-medium" accessibilityRole="header">{job.companyName}</Text>
          <Text variant="body-large" color="on-surface-variant">{`${weekday}, ${day} ${month}, ${formatTimeRange(job.startTime, job.endTime)}`}</Text>
          <View className="flex-row gap-2 pt-1">
            <StatusChip label={chip.label} tone={chip.tone} showIcon={false} />
          </View>
          {!!job.cancelReason && <Text variant="body-medium" color="error">{`Cancelled: ${job.cancelReason}`}</Text>}
        </View>

        <Panel>
          <ListItem
            leadingIcon="location_on"
            headline={job.locationAddress}
            trailingIcon={hasPin ? "open_in_new" : undefined}
            onPress={hasPin ? openMaps : undefined}
            accessibilityLabel={`Open ${job.locationAddress} in maps`}
          />
        </Panel>

        <Subheader label="Roster" />
        {isLoading ? (
          <ActivityIndicator className="py-8" color={colors.primary} />
        ) : error ? (
          <EmptyState icon="cloud_off" title="Couldn't load the roster" body={error} actionLabel="Try again" onAction={load} />
        ) : (
          job.jobRoles.map(roster)
        )}
      </ScrollView>

      {cancellable && (
        <BottomActionBar>
          <View className="flex-1 gap-2">
            <Button
              variant="outlined"
              tone="error"
              label="Cancel job"
              onPress={() => setCancelOpen(true)}
              disabled={!inWindow}
              className="w-full"
            />
            {!inWindow && (
              <View className="flex-row items-center justify-center gap-1">
                <Icon name="info" size={16} />
                <Text variant="body-small" color="on-surface-variant">Cancelling closes 2 days before the shift</Text>
              </View>
            )}
          </View>
        </BottomActionBar>
      )}

      <Snackbar message={snack} onHide={hideSnack} bottomOffset={cancellable ? 88 : 0} />

      <ReasonSheet
        visible={cancelOpen}
        onDismiss={() => setCancelOpen(false)}
        title="Cancel this job?"
        supportingText={`${job.companyName}, ${formatLongDate(job.date)}. Pick a reason. Workers who accepted will see it.`}
        reasons={CANCEL_REASONS}
        dismissLabel="Keep job"
        confirmLabel="Cancel job"
        onConfirm={handleCancel}
        loading={isCancelling}
      />
    </Screen>
  );
}

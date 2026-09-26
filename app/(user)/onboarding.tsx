import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { Dropdown } from '@/components/ui/dropdown';
import { OutlinedInput } from '@/components/ui/outlined-input';
import { User } from '@/src/services/userService';
import { useAuthStore } from '@/src/store/useAuthStore'
import { useState } from 'react';
import { StyleSheet, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const dropdownOptions= [
  {label: 'Steward', value: 'steward'},
  {label: 'Chef', value: 'chef'},
  {label: 'Driver', value: 'driver'}
]

function OnBoardingScreen() {
  const insets = useSafeAreaInsets();
 const {updateUserProfile, isLoading} = useAuthStore();
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [role, setRole] = useState< User['role'] >(null);
  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-background"
      contentContainerClassName="flex-grow justify-center px-6 py-12"
      keyboardShouldPersistTaps='handled'
      enableOnAndroid={true}
    >
      <View
        className='flex flex-1 gap-8'
        style={{paddingTop: insets.top, paddingBottom: insets.bottom}}
      >
        <OutlinedInput
          label='First Name'
          value={firstName}
          onChangeText={(text) => setFirstName(text)}
          placeholder='First Name'
        />
        <OutlinedInput
          label='Last Name'
          value={lastName}
          onChangeText={(text) => setLastName(text)}
          placeholder='Last Name'
        />
        <Dropdown
          label='Role'
          placeholder="select a role..."
          options={dropdownOptions}
          value={role ?? ''}
          onSelect={(newValue) => setRole(newValue as User['role'])}
        />
        <PrimaryButton
          onPress={() => updateUserProfile({ role, firstName, lastName })}
          label='Update Profile'
          loading={isLoading}
          className='mt-auto'
        />
      </View>
    </KeyboardAwareScrollView>
  )
}

export default OnBoardingScreen

const styles = StyleSheet.create({})

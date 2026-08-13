import { PrimaryButton } from '@/components/ui/button'
import { useAuthStore } from '@/src/store/useAuthStore'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const onboarding = () => {
 const {logout} = useAuthStore();
  return (
    <SafeAreaView>
      <View className='flex'>
        <Text>onboarding</Text>
        <PrimaryButton
          onPress={() => logout()}
          label='Logout'
          className='mt-auto'
        />
      </View>
    </SafeAreaView>
  )
}

export default onboarding

const styles = StyleSheet.create({})
